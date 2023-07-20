import React, { useRef, useEffect, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import GoogleMapReact from 'google-map-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { Typeahead } from 'react-bootstrap-typeahead';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import Quagga from 'quagga';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  const scannerContainerRef = useRef(null);
  const videoRef = useRef(null);
  const codeReader = useRef(null);
  const [barcode, setBarcode] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [name, setName] = useState('');
  const [store, setStore] = useState('');
  const [stores, setStores] = useState([]);
  const [price, setPrice] = useState('');
  const [products, setProducts] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [url, setUrl] = useState('http://localhost:3333'); //  https://super-polo-shirt-tick.cyclic.app
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [videoDevices, setVideoDevices] = useState([]);
  const Marker = () => <div className="marker"><span role="img">📍</span></div>;

  useEffect(() => {
    fetch(`${url}/api/products`)
      .then((response) => response.json())
      .then((data) => setProducts(data))
      .catch((error) => {
        console.error('Error:', error);
      });

    fetch(`${url}/api/stores`)
      .then((response) => response.json())
      .then((data) => {
        setStores(data);
      })
      .catch((error) => {
        console.error('Error:', error);
      });

    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');
      setVideoDevices(videoDevices);
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
              // deviceId: selectedCamera,
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

  useEffect(() => {
    Quagga.init(
      {
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: scannerContainerRef.current,
          constraints: {
            width: 320,
            height: 200,
            facingMode: 'environment', // use the rear camera
          },
        },
        decoder: {
          readers: ['ean_reader'], // specify the barcode format to scan (EAN in this case)
        },
      },
      (err) => {
        if (err) {
          console.error(err);
        } else {
          Quagga.start();
        }
      }
    );

    Quagga.onDetected(async (result) => {
      const scannedBarcode = result.codeResult.code;
      setBarcode(scannedBarcode);
      try {
        const response = await fetch(`${url}/api/searchProduct?code=${scannedBarcode}`);
        const responseData = await response.json();
        setName(responseData.name);
      } catch (error) {
        console.error(error);
      }
    });

    return () => {
      Quagga.stop();
    };
  }, []);

  const handleNameFieldClick = async () => {
    try {
      const response = await fetch(`${url}/api/products/${barcode}`);
      if (response.ok) {
        const product = await response.json();
        // setName(product.name);?????????????????????
      } else {
        console.error('Грешка при извличане на продукта');
      }
    } catch (error) {
      console.error('Грешка при изпращане на заявката', error);
    }
  };

  const handleInputChange = (selected,e) => {
    if (selected.length > 0) {
      setStore(selected[0].name || '');
    }  
  };

  const handleAddProduct = async () => {
      console.log(barcode, name, price, store,newStoreName, currentLocation);
    try {
      if (store && !stores.some((s) => s.name === store)) {
        // Create a new store if it doesn't exist in the database
        const response = await fetch(`${url}/api/stores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: store }),
        });
        if (!response.ok) {
          console.error('Грешка при създаване на магазина');
          return;
        }
        const newStoreData = await response.json();
        setStores([...stores, newStoreData]);
      }

      const response = await fetch(`${url}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode, name, price, store: store || newStoreName, location: currentLocation }),
      });

      if (!response.ok) {
        console.error('Грешка при създаване на продукта');
        return;
      }

      const productsData = await fetch(`${url}/api/products`).then((res) => res.json());
      setProducts(productsData);
      // Clear input fields after successfully adding the product
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
      <h1>Добави продукт по баркод</h1>
      <div className="d-flex justify-content-center mb-3">
        <video ref={videoRef} width={300} height={200} autoPlay={true} />
      </div>
      <div ref={scannerContainerRef} />

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
        <Typeahead
          onInputChange={ (text) => setNewStoreName(text)}
          id="storeTypeahead"
          options={stores.filter((option) => option.name && typeof option.name === 'string')}
          labelKey="name"
          placeholder="Магазин"
          selected={store ? [store] : []}
          onChange={handleInputChange}
          filterBy={(option, props) =>
            String(option.name).toLowerCase().includes(String(props.text).toLowerCase())
          }
        />
        <input
          type="number"
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
          <li className="list-group-item" key={index}>
            <div className="d-flex flex-column">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <b>{product.barcode}</b><br />
                  <span className="text-muted">
                    {product.date ? new Date(product.date).toLocaleDateString() : '-'}
                  </span>
                </div>
                <button className="btn btn-link" onClick={() => handleDeleteProduct(product._id)}>
                  <FontAwesomeIcon icon={faTrashAlt} />
                </button>
              </div>
              <div className="mt-2">
                <div>
                  <span className="font-weight-bold">Име:</span> {product.name}
                </div>
                <div>
                  <span className="font-weight-bold">Цена:</span> {product.price} лв.
                </div>
                <div>
                  <span className="font-weight-bold">Магазин:</span> {product.store}
                </div>
                <div>
                  <span className="font-weight-bold">Локация:</span> {product.location.lat}, {product.location.lng}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <br />

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
