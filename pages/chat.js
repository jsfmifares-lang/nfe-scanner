import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

export default function Chat() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [texto, setTexto] = useState("");
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [erro, setErro] = useState("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    const raw = localStorage.getItem("nfe_user");
    if (!raw) {
      router.replace("/login");
      return;
    }
    setUser(JSON.parse(raw));
    loadMessages();
    const interval = setInterval(loadMessages, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages() {
    try {
      const res = await fetch("/api/chat/messages");
      const data = await res.json();
      if (res.ok) setMessages(data);
    } catch {
      // ignora falha silenciosa de polling
    }
  }

  async function sendText(e) {
    e.preventDefault();
    if (!texto.trim() || !user) return;
    setSending(true);
    setErro("");
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remetente: user.usuario, mensagem: texto })
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error || "Falha ao enviar mensagem");
        return;
      }
      setTexto("");
      loadMessages();
    } catch (err) {
      setErro("Erro de conexão: " + (err.message || String(err)));
    } finally {
      setSending(false);
    }
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const candidates = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"];
      const mimeType = candidates.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(t));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const usedType = recorder.mimeType || "audio/webm";
        const ext = usedType.includes("mp4") ? "m4a" : usedType.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(chunksRef.current, { type: usedType });
        const reader = new FileReader();
        reader.onloadend = async () => {
          setSending(true);
          setErro("");
          try {
            const res = await fetch("/api/chat/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ remetente: user.usuario, audioDataUrl: reader.result, ext })
            });
            const data = await res.json();
            if (!res.ok) {
              setErro(data.error || "Falha ao enviar áudio");
              return;
            }
            loadMessages();
          } catch (err) {
            setErro("Erro de conexão: " + (err.message || String(err)));
          } finally {
            setSending(false);
          }
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      alert("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    }
  }

  if (!user) return null;

  return (
    <div className="page">
      <div className="chat-wrap">
        <div className="chat-header">
          <div>
            <div style={{ fontWeight: 700 }}>Chat do Grupo</div>
            <div style={{ fontSize: 11, opacity: 0.8 }}>Todos os usuários</div>
          </div>
          <button className="icon-btn" style={{ color: "#fff" }} onClick={() => router.push("/app")}>✕</button>
        </div>
        <div className="chat-messages">
          {messages.map((m) => {
            const mine = m.remetente === user.usuario;
            const isAudio = m.mensagem.startsWith("AUDIO::");
            return (
              <div className={`msg-row ${mine ? "mine" : ""}`} key={m.chat_id}>
                <div className="msg-bubble">
                  {!mine && <div className="msg-sender">{m.remetente}</div>}
                  {isAudio ? (
                    <audio controls src={`/api/photo?id=${m.mensagem.replace("AUDIO::", "")}`} style={{ maxWidth: 220 }} />
                  ) : (
                    <div>{m.mensagem}</div>
                  )}
                  <div className="msg-time">{m.data_hora}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <form className="chat-input-row" onSubmit={sendText}>
          {erro && <div className="error-msg" style={{ position: "absolute", bottom: 60, left: 10, right: 10 }}>{erro}</div>}
          <input
            type="text"
            placeholder="Escreva uma mensagem..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={sending}
          />
          {texto.trim() ? (
            <button type="submit" className="round-btn" disabled={sending}>➤</button>
          ) : (
            <button
              type="button"
              className={`round-btn ${recording ? "recording" : ""}`}
              onClick={toggleRecording}
            >
              🎤
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
