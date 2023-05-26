import React, { useRef, useState, useEffect } from 'react';
import GoogleMapReact from 'google-map-react';
import Webcam from 'react-webcam';
import Quagga from 'quagga';

const Marker = () => <div className="marker"><span role="img">📍</span></div>;

function App() {
  const [products, setProducts] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [store, setStore] = useState('');
  const [price, setPrice] = useState('');
  const webcamRef = useRef(null);
  const nameRef = useRef('');


  useEffect(() => {
    fetch('https://super-polo-shirt-tick.cyclic.app/api/products')
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

    Quagga.init(
      {
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: webcamRef.current.video,
        },
        decoder: {
          readers: ['ean_reader'],
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

    Quagga.onDetected((result) => {
      const scannedBarcode = result.codeResult.code;
      setBarcode(scannedBarcode);
    });

    return () => {
      Quagga.stop();
    };
  }, []);

  const handleNameFieldClick = async () => {
    try {
      const response = await fetch(`https://super-polo-shirt-tick.cyclic.app/api/products/${barcode}`);
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
      const response = await fetch('https://super-polo-shirt-tick.cyclic.app/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode, name, price, store, location: currentLocation }),
      });
  
      if (!response.ok) {
        console.error('Грешка при създаване на продукта');
        return;
      }
  
      const productsData = await fetch('https://super-polo-shirt-tick.cyclic.app/api/products').then((res) => res.json());
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
      const response = await fetch(`https://super-polo-shirt-tick.cyclic.app/api/products/${productId}`, {
        method: 'DELETE',
      });
  
      if (!response.ok) {
        console.error('Грешка при изтриване на продукта');
        return;
      }
  
      const productsData = await fetch('https://super-polo-shirt-tick.cyclic.app/api/products').then((res) => res.json());
      setProducts(productsData);
    } catch (error) {
      console.error('Грешка при изпращане на заявката', error);
    }
  };
  
  return (
    <div>
      <div>
      <h1>Barcode Scanner</h1>
        <div style={{ width: '300px', margin: 'auto' }}>
          <Webcam ref={webcamRef} width={300} height={200} />
        </div>
      </div>
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
      <div>
        <input
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Баркод"
        />
        <input
          type="text"
          ref={nameRef}
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
    </div>
  );
}

export default App;
