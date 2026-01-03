import React, { useRef, useState } from "react";
import Webcam from "react-webcam";

import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";

export default function App() {
  const webcamRef = useRef(null);
  const [captured, setCaptured] = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); //'背面カメラ切り替え追加'
  const videoConstraints = { facingMode: { ideal: facingMode } };


  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    setCaptured(imageSrc);
  };

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              gap: 12,
            }}
          >
            <div>ログイン中: {user?.username}</div>
            <button onClick={signOut}>ログアウト</button>
          </div>

          <h2>カメラ撮影</h2>

          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}   // 追加
            style={{ width: 640, maxWidth: "100%", background: "black" }}
          />
        
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button onClick={capture}>撮影</button>

            <button
              onClick={() =>
                setFacingMode((prev) =>
                  prev === "environment" ? "user" : "environment"
                )
              }
            >
              カメラ切替（{facingMode === "environment" ? "背面" : "前面"}）
            </button>
          </div>
          

          {captured && (
            <div style={{ marginTop: 16 }}>
              <h3>撮影結果</h3>
              <img
                src={captured}
                alt="captured"
                style={{
                  width: 320,
                  maxWidth: "100%",
                  border: "1px solid #ccc",
                }}
              />
            </div>
          )}
        </div>
      )}
    </Authenticator>
  );
}
