import React, { useRef, useEffect, useState } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/library';
import GoogleMapReact from 'google-map-react';

import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const videoRef = useRef(null);
  const codeReader = useRef(null);
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [store, setStore] = useState('');
  const [price, setPrice] = useState('');
  const [products, setProducts] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [url, setUrl] = useState('https://super-polo-shirt-tick.cyclic.app'); // 
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [videoDevices, setVideoDevices] = useState([]);
  const Marker = () => <div className="marker"><span role="img">📍</span></div>;

  useEffect(() => {
    fetch(`${url}/api/products`)
      .then((response) => response.json())
      .then((data) => setProducts(data));

    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const videoDevices = setVideoDevices(devices.filter((device) => device.kind === 'videoinput'));
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
      },
      (error) => {
        console.error('Грешка при вземане на текущата локация:', error);
      }
    );
  }, []);

  useEffect(() => {
    if (selectedCamera) {
      codeReader.current = new BrowserMultiFormatReader();

      const startScanner = async () => {
        try {
          const constraints = {
            video: {
              aspectRatio: 1.7777777778,
              focusMode: 'continuous', // Enable continuous focus
              deviceId: selectedCamera,
              width: { ideal: 200 },
              height: { ideal: 100 },
            },
          };

          await codeReader.current.decodeFromVideoDevice(null, videoRef.current, (result) => {
            if (result !== null) {
              const barcode = result.getText();
              setBarcode(barcode);
              console.log('Scanned barcode:', barcode);
            }
          }, constraints);
        } catch (error) {
          console.error('Failed to start barcode scanner:', error);
        }
      };

      startScanner();

      return () => {
        codeReader.current.reset();
      };
    }
  }, [selectedCamera]);

  const handleNameFieldClick = async () => {
    try {
      const response = await fetch(`${url}/api/products/${barcode}`);
      if (response.ok) {
        const product = await response.json();
        setName(product.name);
      } else {
        console.error('Грешка при извличане на продукта');
      }
    } catch (error) {
      console.error('Грешка при изпращане на заявката', error);
    }
  };

  const handleAddProduct = async () => {
    try {
      const response = await fetch(`${url}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode, name, price, store, location: currentLocation }),
      });

      if (!response.ok) {
        console.error('Грешка при създаване на продукта');
        return;
      }

      const productsData = await fetch(`${url}/api/products`).then((res) => res.json());
      setProducts(productsData);
      // Изчистване на полетата за въвеждане след успешно добавяне на продукта
      setBarcode('');
      setName('');
      setPrice('');
      setStore('');
    } catch (error) {
      console.error('Грешка при изпращане на заявката', error);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      const response = await fetch(`${url}/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.error('Грешка при изтриване на продукта');
        return;
      }

      const productsData = await fetch(`${url}/api/products`).then((res) => res.json());
      setProducts(productsData);
    } catch (error) {
      console.error('Грешка при изпращане на заявката', error);
    }
  };

  const handleCameraChange = (event) => {
    setSelectedCamera(event.target.value);
  };

  return (
    <div className="container">
      <h1>Barcode Scanner</h1>
      <div className="d-flex justify-content-center mb-3">
        <video ref={videoRef} width={300} height={200} autoPlay={true} />
      </div>
      <select className="form-select mb-3" value={selectedCamera} onChange={handleCameraChange}>
        {videoDevices.map((device) => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label}
          </option>
        ))}
      </select>
      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Баркод"
        />
        <input
          type="text"
          className="form-control"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onClick={handleNameFieldClick}
          placeholder="Име"
        />
        <input
          type="text"
          className="form-control"
          value={store}
          onChange={(e) => setStore(e.target.value)}
          placeholder="Магазин"
        />
        <input
          type="text"
          className="form-control"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Цена"
        />
        <div className="d-flex justify-content-end">
          <button className="btn btn-primary" onClick={handleAddProduct}>Добави продукт</button>
        </div>
      </div>
      <h2>Продукти</h2>
      <ul className="list-group">
        {products.map((product, index) => (
          <li className="list-group-item d-flex justify-content-between align-items-center" key={index}>
            {product.date ? new Date(product.date).toLocaleDateString() : '-'}
            <b>{product.barcode}</b>
            {product.name} - {product.price} лв. - {product.store} - {product.location.lat}, {product.location.lng}
            <button className="btn btn-danger" onClick={() => handleDeleteProduct(product._id)}>Изтрий</button>
          </li>
        ))}
      </ul>
  
      <div style={{ height: '400px', width: '100%' }}>
        {currentLocation && (
          <GoogleMapReact
            bootstrapURLKeys={{ key: process.env.REACT_APP_GOOGLE_API_KEY }}
            defaultCenter={currentLocation}
            center={currentLocation}
            defaultZoom={10}
          >
            <Marker lat={currentLocation.lat} lng={currentLocation.lng} />
          </GoogleMapReact>
        )}
      </div>
    </div>
  );
  
}

export default App;
