import React, { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";

import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { uploadData } from "aws-amplify/storage";// upload追加
//import { getCurrentUser } from "aws-amplify/auth";
import { fetchAuthSession } from "aws-amplify/auth";



const getIdentityId = async () => {
  const session = await fetchAuthSession();
  return session.identityId;
};

const toBlob = async (dataUrl) => {
  // data:image/jpeg;base64,... -> Blob に変換
  const res = await fetch(dataUrl);
  return await res.blob();
};

export default function App() {
  const webcamRef = useRef(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [answer, setAnswer] = useState("");

  const [analyzing, setAnalyzing] = useState(false);
  const [mode, setMode] = useState("camera"); // "camera" | "preview" | "uploading" | "success" | "error"
  const [facingMode, setFacingMode] = useState("environment"); // "user" or "environment"
  const [imageSrc, setImageSrc] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadedKey, setUploadedKey] = useState(null);

  const videoConstraints = { facingMode: { ideal: facingMode } };

  const capture = useCallback(() => {
    setErrorMessage("");
    const src = webcamRef.current?.getScreenshot();
    if (!src) {
      setErrorMessage("撮影に失敗しました。ブラウザの権限やHTTPSを確認してください。");
      setMode("error");
      return;
    }
    setImageSrc(src);
    setMode("preview");
  
  }, []);

  const retake = () => {
    setErrorMessage("");
    setImageSrc(null);
    setMode("camera");
  };

  // ★ここを次にS3アップロードに差し替える
  // const uploadImage = async (blob) => {
  //   // ダミー：2秒待つだけ
  //   await new Promise((r) => setTimeout(r, 2000));
  //   // 失敗テストしたい場合は下の行を有効化
  //   // throw new Error("アップロードに失敗しました（ダミー）");
  // };



  // const uploadImage = async (blob) => {
  //   const ext = blob.type === "image/png" ? "png" : "jpg";
  //   const filename = `camera_${Date.now()}.${ext}`;

  //   const result = await uploadData({
  //     key: filename, // ★ここを key に
  //     data: blob,
  //     options: {
  //       accessLevel: "protected",
  //       contentType: blob.type || "image/jpeg",
  //     },
  //   }).result;

  //   console.log("uploaded:", result);
  // };

  const uploadImage = async (blob) => {
    const ext = blob.type === "image/png" ? "png" : "jpg";
    const filename = `camera_${Date.now()}.${ext}`;

    const result = await uploadData({
      key: filename,
      data: blob,
      options: {
        accessLevel: "protected",
        contentType: blob.type || "image/jpeg",
      },
    }).result;

    // ★ここが重要
    // Amplify Storage は「key=filename」を返す
    // Lambda には「protected/filename」を渡す
    setUploadedKey(`protected/${filename}`);

    console.log("uploaded:", result);
  };


  const onUpload = async () => {
    if (!imageSrc) return;
    setMode("uploading");
    setErrorMessage("");

    try {
      const blob = await toBlob(imageSrc);
      await uploadImage(blob);
      setMode("success");
    } catch (e) {
      setErrorMessage(e?.message ?? "アップロードに失敗しました。");
      setMode("error");
    }
  };

  const analyzeImage = async () => {
  setAnalyzing(true);
  setErrorMessage("");

  try {
    const identityId = await getIdentityId();

    const res = await fetch(
      "https://mumvq5zd2swl2n5aupgocrp6ve0bprgh.lambda-url.ap-northeast-1.on.aws/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageKey: uploadedKey,
          identityId: identityId,
        }),
      }
    );

    const data = await res.json();
    console.log("Lambda response:", data);

    if (!res.ok) {
      throw new Error(data?.error ?? `Lambda error: ${res.status}`);
    }

    setAnalysisResult(data.results ?? []);
    setAnswer(data.answer ?? "");

  } catch (e) {
    setErrorMessage(e?.message ?? "解析に失敗しました。");
    setMode("error");
  } finally {
    setAnalyzing(false);
  }
};




  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div style={styles.app}>
          {/* Header */}
          <header style={styles.header}>
            <div style={styles.headerTitle}>カメラアップロード</div>
            <div style={styles.headerRight}>
              <button style={styles.headerBtn} onClick={toggleCamera} disabled={mode !== "camera"}>
                切替
              </button>
              <button style={styles.headerBtn} onClick={signOut}>
                ログアウト
              </button>
            </div>
          </header>

          {/* Main */}
          <main style={styles.main}>
            {mode === "camera" && (
              <div style={styles.stage}>
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  screenshotQuality={0.92}
                  videoConstraints={videoConstraints}
                  style={styles.media}
                />
              </div>
            )}

          {analysisResult && (
            <div style={{ marginTop: 12, maxWidth: 520 }}>
              <h3>解析結果</h3>
              {analysisResult.map((r, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <b>候補 {i + 1}</b>（score: {r.score.toFixed(2)}）
                  <pre style={{ whiteSpace: "pre-wrap" }}>{r.text}</pre>
                </div>
              ))}
            </div>
          )}
          {answer && (
            <div style={{ marginTop: 16 }}>
              <h3>LLMの回答</h3>
              <pre style={{ whiteSpace: "pre-wrap" }}>
                {answer}
              </pre>
            </div>
          )}




            {(mode === "preview" || mode === "uploading" || mode === "success" || mode === "error") && (
              <div style={styles.stage}>
                {imageSrc ? <img src={imageSrc} alt="captured" style={styles.media} /> : null}

                {mode === "uploading" && (
                  <div style={styles.overlay}>
                    <div style={styles.overlayCard}>アップロード中...</div>
                  </div>
                )}



                {mode === "error" && errorMessage && (
                  <div style={styles.overlay}>
                    <div style={styles.overlayCardError}>{errorMessage}</div>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* Footer */}
          <footer style={styles.footer}>
            {mode === "camera" && (
              <button style={styles.primaryBtn} onClick={capture}>
                撮影
              </button>
            )}

            {mode === "preview" && (
              <div style={styles.footerRow}>
                <button style={styles.secondaryBtn} onClick={retake}>
                  撮り直し
                </button>
                <button style={styles.primaryBtn} onClick={onUpload}>
                  アップロード
                </button>
              </div>
            )}
            {mode === "success" && (
              <div style={styles.footerRow}>
                <button style={styles.secondaryBtn} onClick={retake}>
                  もう一枚撮る
                </button>
                <button
                  style={styles.primaryBtn}
                  onClick={analyzeImage}
                  disabled={analyzing || !uploadedKey}
                >
                  {analyzing ? "解析中..." : "解析する"}
                </button>
              </div>
            )}

            {mode === "uploading" && (
              <button style={styles.primaryBtn} disabled>
                アップロード中...
              </button>
            )}

            {(mode === "error") && (
              <div style={styles.footerRow}>
                <button style={styles.secondaryBtn} onClick={retake}>
                  もう一枚撮る
                </button>
                {mode === "error" && (
                  <button style={styles.primaryBtn} onClick={onUpload} disabled={!imageSrc}>
                    再アップロード
                  </button>
                )}
              </div>
            )}
          </footer>

          {/* small status */}
          <div style={styles.smallInfo}>
            ログイン中: {user?.username ?? "unknown"}
          </div>
        </div>
      )}
    </Authenticator>
  );


}


const styles = {
  app: {
    height: "100dvh",
    display: "flex",
    flexDirection: "column",
    background: "#0b0f1a",
    color: "#fff",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
  },
  header: {
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 12px",
    borderBottom: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    backdropFilter: "blur(8px)",
  },
  headerTitle: { fontSize: 16, fontWeight: 700 },
  headerRight: { display: "flex", gap: 8 },
  headerBtn: {
    height: 34,
    padding: "0 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column", // ★追加
    gap: 12,                 // ★追加
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stage: {
    position: "relative",
    width: "100%",
    maxWidth: 520,
    aspectRatio: "3 / 4",
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
  },
  media: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,0,0,0.35)",
  },
  overlayCard: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.45)",
    fontWeight: 700,
  },
  overlayCardError: {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,80,80,0.4)",
    background: "rgba(0,0,0,0.55)",
    fontWeight: 700,
    maxWidth: 360,
  },
  footer: {
    minHeight: 76,
    padding: "10px 12px 14px",
    borderTop: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.25)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  footerRow: {
    width: "100%",
    maxWidth: 520,
    display: "flex",
    gap: 10,
  },
  primaryBtn: {
    width: "100%",
    maxWidth: 520,
    height: 48,
    borderRadius: 14,
    border: "none",
    background: "#3b82f6",
    color: "#fff",
    fontSize: 16,
    fontWeight: 800,
  },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 800,
  },
  smallInfo: {
    position: "fixed",
    right: 10,
    bottom: 6,
    fontSize: 11,
    opacity: 0.7,
  },
};
