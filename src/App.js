import React, { useRef, useState } from "react";
import Webcam from "react-webcam";

export default function App() {
  const webcamRef = useRef(null);
  const [captured, setCaptured] = useState(null);

  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    setCaptured(imageSrc);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>カメラ撮影</h2>

      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        style={{ width: 640, maxWidth: "100%", background: "black" }}
      />

      <div style={{ marginTop: 12 }}>
        <button onClick={capture}>撮影</button>
      </div>

      {captured && (
        <div style={{ marginTop: 16 }}>
          <h3>撮影結果</h3>
          <img
            src={captured}
            alt="captured"
            style={{ width: 320, maxWidth: "100%", border: "1px solid #ccc" }}
          />
        </div>
      )}
    </div>
  );
}
