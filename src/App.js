import React, { useRef, useEffect, useState } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat } from '@zxing/library';
import GoogleMapReact from 'google-map-react';

function App() {
  const videoRef = useRef(null);
  const codeReader = useRef(null);
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [store, setStore] = useState('');
  const [price, setPrice] = useState('');
  const [products, setProducts] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [url, setUrl] =  useState('https://super-polo-shirt-tick.cyclic.app'); //
  const Marker = () => <div className="marker"><span role="img">📍</span></div>;


  useEffect(() => {

           

    fetch(`${url}/api/products`)
      .then((response) => response.json())
      .then((data) => setProducts(data));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
      },
      (error) => {
        console.error('Грешка при вземане на текущата локация:', error);
      }
    );

    codeReader.current = new BrowserMultiFormatReader();

    const startScanner = async () => {
      try {
        await codeReader.current.listVideoInputDevices();

        const videoInputDevices = await codeReader.current.getVideoInputDevices();
        const backCamera = videoInputDevices.find(
          (device) => device.label.includes('back') || device.label.includes('rear')
        );

        const constraints = {
          video: {
            deviceId: backCamera && backCamera.deviceId,
            facingMode: 'environment', // Use the back camera
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        codeReader.current.decodeFromVideoDevice(null, videoRef.current, (result) => {
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
  }, []);


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

  return (
  <div>
      <h1>Barcode Scanner</h1>
      <div style={{ width: '300px', margin: 'auto' }}>
        <video ref={videoRef} width={600} height={500} autoPlay={true} />
      </div>
   
    <div>
      <input
        type="text"
        value={barcode}
        onChange={(e) => setBarcode(e.target.value)}
        placeholder="Баркод"
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onClick={handleNameFieldClick}
        placeholder="Име"
      />
      <input
        type="text"
        value={store}
        onChange={(e) => setStore(e.target.value)}
        placeholder="Магазин"
      />
      <input
        type="text"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Цена"
      />
      <button onClick={handleAddProduct}>Добави продукт</button>
    </div>
    <h2>Продукти</h2>
    <ul>
      {products.map((product, index) => (
        <li key={index}>
          <b>{product.barcode}</b> | {product.name} - {product.price} лв. - {product.store} - {product.location.lat}, {product.location.lng}
          <button onClick={() => handleDeleteProduct(product._id)}>Изтрий</button>
        </li>
      ))}
    </ul>

     <div style={{ height: '400px', width: '100%' }}>
        {currentLocation && (
          <GoogleMapReact
            bootstrapURLKeys={{ key: 'AIzaSyBi-dNArY1fDxJXC5xesQU43hOW1U3NgRg' }}
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