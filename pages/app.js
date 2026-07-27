import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

const USUARIOS_AUTORIZADOS_NFE = ["esterfane", "johnny", "wiliam", "william"];

function podeEnviarNfe(usuario) {
  return USUARIOS_AUTORIZADOS_NFE.includes((usuario || "").trim().toLowerCase());
}

export default function AppPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("idle"); // idle | camera | review
  const [capturedUrl, setCapturedUrl] = useState(null);
  const [nfe, setNfe] = useState(null);
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const [modalPhotoId, setModalPhotoId] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const raw = localStorage.getItem("nfe_user");
    if (!raw) {
      router.replace("/login");
      return;
    }
    setUser(JSON.parse(raw));
    loadItems();
  }, []);

  async function loadItems() {
    setLoadingList(true);
    try {
      const res = await fetch("/api/list-nfe");
      const data = await res.json();
      if (res.ok) setItems(data);
    } catch {
      // silencioso, lista pode ser atualizada de novo depois
    } finally {
      setLoadingList(false);
    }
  }

  function logout() {
    localStorage.removeItem("nfe_user");
    router.replace("/login");
  }

  async function startCamera() {
    setErro("");
    setMode("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setErro("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
      setMode("idle");
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function cancelCamera() {
    stopCamera();
    setMode("idle");
  }

  async function captureAndRead() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    stopCamera();
    setCapturedUrl(dataUrl);
    setExtracting(true);
    setErro("");
    try {
      const res = await fetch("/api/extract-nfe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl })
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Falha ao ler a NFe");
        setMode("idle");
        return;
      }
      setNfe(data);
      setMode("review");
    } catch {
      setErro("Erro de conexão ao processar a imagem.");
      setMode("idle");
    } finally {
      setExtracting(false);
    }
  }

  async function confirmSave() {
    setSaving(true);
    setErro("");
    try {
      const res = await fetch("/api/save-nfe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nfe, dataUrl: capturedUrl, usuarioId: user?.usuario_id, usuario: user?.usuario })
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Falha ao salvar");
        return;
      }
      setMode("idle");
      setNfe(null);
      setCapturedUrl(null);
      loadItems();
    } catch {
      setErro("Erro de conexão ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="page">
      <div className="topbar">
        <div className="brand">
          <div className="brand-icon">📄</div>
          <div>
            <div className="brand-title">NFe Scanner</div>
            <div className="brand-sub">Olá, {user.usuario}</div>
          </div>
        </div>
        <div className="topbar-right">
          <Link href="/chat" className="icon-btn" title="Chat do grupo">💬</Link>
          <button className="icon-btn" onClick={logout} title="Sair">⏻</button>
        </div>
      </div>

      <div className="container-main">
        {mode === "idle" && (
          <div className="card">
            <h1 className="title">Enviar NFe</h1>
            <p className="subtitle">Tire uma foto da NFe impressa para extrair os dados.</p>
            {podeEnviarNfe(user.usuario) ? (
              <button className="btn-primary" onClick={startCamera}>📷 Tirar foto</button>
            ) : (
              <p className="subtitle" style={{ marginTop: 4 }}>
                Apenas entregadores autorizados podem enviar NFe. Você ainda pode ver a lista de lançamentos e usar o chat.
              </p>
            )}
            {erro && <div className="error-msg">{erro}</div>}
          </div>
        )}

        {mode === "camera" && (
          <div className="card">
            <div className="capture-box">
              <video ref={videoRef} autoPlay playsInline muted />
            </div>
            <div className="capture-actions">
              <button className="btn-cancel" onClick={cancelCamera}>✕ Cancelar</button>
              <button className="btn-primary" onClick={captureAndRead}>📷 Capturar e ler</button>
            </div>
          </div>
        )}

        {mode === "review" && (
          <div className="card">
            <h1 className="title">Confirmar dados</h1>
            <p className="subtitle">Confira se a IA capturou tudo certinho antes de salvar.</p>
            {capturedUrl && (
              <img src={capturedUrl} alt="Foto capturada" style={{ width: "100%", borderRadius: 10, marginBottom: 12 }} />
            )}
            {extracting ? (
              <div className="loading-text">Lendo a nota com IA...</div>
            ) : (
              nfe && (
                <>
                  <div className="review-field">
                    <label className="field-label">Nº da NFe</label>
                    <input type="text" value={nfe.numero_nfe} onChange={(e) => setNfe({ ...nfe, numero_nfe: e.target.value })} />
                  </div>
                  <div className="review-field">
                    <label className="field-label">Razão Social / Destinatário</label>
                    <input type="text" value={nfe.razao_social} onChange={(e) => setNfe({ ...nfe, razao_social: e.target.value })} />
                  </div>
                  <div className="review-field">
                    <label className="field-label">Nome da Paciente</label>
                    <input type="text" value={nfe.nome_paciente} onChange={(e) => setNfe({ ...nfe, nome_paciente: e.target.value })} />
                  </div>
                  <div className="review-field">
                    <label className="field-label">Nome da Vendedora</label>
                    <input type="text" value={nfe.nome_vendedora} onChange={(e) => setNfe({ ...nfe, nome_vendedora: e.target.value })} />
                  </div>
                  {erro && <div className="error-msg">{erro}</div>}
                  <div className="capture-actions">
                    <button className="btn-cancel" onClick={() => { setMode("idle"); setNfe(null); setCapturedUrl(null); }}>✕ Cancelar</button>
                    <button className="btn-primary" onClick={confirmSave} disabled={saving}>
                      {saving ? "Salvando..." : "✓ Salvar"}
                    </button>
                  </div>
                </>
              )
            )}
          </div>
        )}

        <div className="section-title">Últimos lançamentos</div>
        <div className="section-sub">
          <span>{items.length} nota(s) na planilha</span>
          <button className="link-btn" style={{ marginTop: 0 }} onClick={loadItems}>Atualizar</button>
        </div>

        {loadingList ? (
          <div className="loading-text">Carregando...</div>
        ) : (
          items.map((item, idx) => (
            <div className="nfe-card" key={idx} onClick={() => item.foto_id && setModalPhotoId(item.foto_id)}>
              <div className="nfe-thumb">Foto</div>
              <div className="nfe-info">
                <div><b>Nº:</b> {item.numero_nfe}</div>
                <div><b>Razão social:</b> {item.razao_social}</div>
                <div><b>Paciente:</b> {item.nome_paciente}</div>
                <div><b>Vendedora:</b> {item.nome_vendedora}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {modalPhotoId && (
        <div className="modal-overlay" onClick={() => setModalPhotoId(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <img src={`/api/photo?id=${modalPhotoId}`} alt="Foto da NFe" />
            <button className="btn-secondary" onClick={() => setModalPhotoId(null)}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
