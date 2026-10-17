import { useEffect, useMemo, useRef, useState } from "react";

const TIPO_DOC_OPTS = ["NOTA", "VALE"];
const TIPO_DEVOLUCAO_OPTS = [
  "",
  "ACERTO POSTERIOR",
  "AGUARDANDO CONFIRMAÇÃO DA MENTOR!",
  "DEVOLUÇÃO PARCIAL",
  "DEVOLUÇÃO TOTAL",
  "PARTICULAR",
  "UTILIZADO",
  "VENDA",
];
const STATUS_PADRAO = "AGUARDANDO CONFIRMAÇÃO DA MENTOR!";

function extrairNumeroDoc(codigoBarras) {
  if (!codigoBarras) return "";
  let s = String(codigoBarras).trim();
  const mParam = s.match(/[?&]p=(\d{44})/i);
  if (mParam) s = mParam[1];
  const dig = s.replace(/\D/g, "");
  if (dig.length === 44) {
    const n = parseInt(dig.slice(25, 34), 10);
    return n ? String(n) : "";
  }
  const m44 = String(codigoBarras).replace(/\s/g, "").match(/(\d{44})/);
  if (m44) return extrairNumeroDoc(m44[1]);
  return "";
}

function gasGet(base, params) {
  const qs = new URLSearchParams(params).toString();
  return fetch(`${base}?${qs}`).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!data || data.success === false) throw new Error(data.mensagem || "Falha no GAS");
    return data;
  });
}

function formatarData(v) {
  if (!v) return "";
  const s = String(v);
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  const d = new Date(s);
  if (!isNaN(d)) return d.toLocaleDateString("pt-BR");
  return s;
}

// Normaliza número para a chave do mapa local (igual ao GAS: 44 dígitos,
// zeros à esquerda e QR viram o número puro)
function chaveMapa(v) {
  const d = String(v == null ? "" : v).replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 44) {
    const n = parseInt(d.slice(25, 34), 10);
    return n ? String(n) : "";
  }
  return d.replace(/^0+/, "") || "";
}

const vazio = {
  codigo_barras: "",
  tipo_doc: "NOTA",
  numero_doc: "",
  cliente_hospital: "",
  paciente: "",
  tipo_devolucao: "",
  observacao: "",
};

export default function Home() {
  const [form, setForm] = useState(vazio);
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState("");
  const [usuario, setUsuario] = useState("Serafim");
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gasUrl, setGasUrl] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [novoCliente, setNovoCliente] = useState("");
  const [savingCliente, setSavingCliente] = useState(false);
  const [listaClientes, setListaClientes] = useState([]);
  const [cliFiltro, setCliFiltro] = useState("");
  const [showCliSug, setShowCliSug] = useState(false);
  const [toast, setToast] = useState(null); // { texto, tipo }
  const toastTimer = useRef(null);

  function showToast(texto, tipo = "ok") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ texto, tipo });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  const barcodeRef = useRef(null);
  const lastAuto = useRef({ cliente: "", paciente: "" });
  const buscaTimer = useRef(null);
  const ultimaBusca = useRef({ numero: "", quando: 0 });
  const mapaColado = useRef({}); // numero -> {cliente, paciente} (lookup instantâneo)
  const mapaTimer = useRef(null);
  const cliInputRef = useRef(null);

  const cliSugestoes = useMemo(() => {
    const q = cliFiltro.trim().toLowerCase();
    if (q.length < 2) return [];
    return listaClientes.filter((c) => c.toLowerCase().includes(q)).slice(0, 30);
  }, [cliFiltro, listaClientes]);

  useEffect(() => {
    const salvo = typeof window !== "undefined" ? localStorage.getItem("mentor_gas_url") || "" : "";
    const envUrl = process.env.NEXT_PUBLIC_GAS_URL || "";
    // Prioridade: URL da Vercel (env) > localStorage. Se env mudar, atualiza o localStorage.
    const inicial = envUrl || salvo;
    if (inicial) {
      setGasUrl(inicial);
      if (envUrl && salvo !== envUrl) {
        try { localStorage.setItem("mentor_gas_url", envUrl); } catch {}
      }
    } else setShowConfig(true);
    const u = typeof window !== "undefined" ? localStorage.getItem("mentor_usuario") || "" : "";
    if (u) setUsuario(u);
  }, []);

  useEffect(() => {
    if (gasUrl && gasUrl.includes("/exec")) {
      carregar(gasUrl);
      carregarMapa(gasUrl);
      carregarClientes(gasUrl);
      // Atualiza a base silenciosamente a cada 10 min (planilha pode mudar no dia)
      if (mapaTimer.current) clearInterval(mapaTimer.current);
      mapaTimer.current = setInterval(() => carregarMapa(gasUrl), 10 * 60 * 1000);
    } else setLoading(false);
    return () => {
      if (mapaTimer.current) clearInterval(mapaTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gasUrl]);

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  async function carregar(url) {
    const base = (url || gasUrl).trim();
    if (!base) return;
    setLoading(true);
    try {
      const data = await gasGet(base, { action: "listar" });
      setLista(Array.isArray(data.dados) ? data.dados : []);
    } catch (e) {
      showToast("Erro ao carregar: " + e.message, "erro");
    } finally {
      setLoading(false);
    }
  }

  function set(campo, valor) {
    let notaExtraida = "";
    setForm((f) => {
      const nf = { ...f, [campo]: valor };
      if (campo === "codigo_barras") {
        const s = String(valor || "").trim();
        const dig = s.replace(/\D/g, "");
        if (dig.length === 44) {
          // Código 44 dígitos (NFe): extrai Nota sozinho
          if (!f.numero_doc) {
            const n = extrairNumeroDoc(s);
            if (n) {
              nf.numero_doc = n;
              notaExtraida = n;
            }
          }
        } else if (s.length > 0 && s.length < 44) {
          // Código curto (VALE): Escolha=VALE, Nota=código
          nf.tipo_doc = "VALE";
          nf.numero_doc = s;
        }
      }
      return nf;
    });
    // Disparo imediato no bip (sem esperar o debounce da digitação)
    if (notaExtraida) buscarNaColado(notaExtraida);
  }

  // Baixa a base Colado 1x (em 2º plano) para lookup instantâneo local.
  // Se a ação ainda não existir no GAS, ignora e segue com a busca por nota.
  async function carregarMapa(url) {
    const base = (url || gasUrl).trim();
    if (!base || !base.includes("/exec")) return;
    try {
      const data = await gasGet(base, { action: "mapaColado" });
      const mapa = {};
      if (Array.isArray(data.mapa)) {
        for (const item of data.mapa) {
          if (Array.isArray(item) && item[0]) {
            mapa[String(item[0])] = { cliente: String(item[1] || ""), paciente: String(item[2] || "") };
          }
        }
      }
      mapaColado.current = mapa;
    } catch (e) {
      // mantém busca individual por nota como fallback
    }
  }

  // Preenche Cliente/Paciente sem apagar o que o usuário digitou à mão
  function aplicarResultado(cli, pac) {
    const pacLimpo = pac === "N/D" ? "" : pac;
    setForm((f) => {
      const nf = { ...f };
      if (!f.cliente_hospital.trim() || f.cliente_hospital === lastAuto.current.cliente) {
        nf.cliente_hospital = cli || f.cliente_hospital;
      }
      if (!f.paciente.trim() || f.paciente === lastAuto.current.paciente) {
        nf.paciente = pacLimpo || f.paciente;
      }
      return nf;
    });
    lastAuto.current = { cliente: cli, paciente: pacLimpo };
  }

  async function buscarNaColado(numero) {
    const num = String(numero || "").trim();
    if (!num || !gasUrl.includes("/exec")) return;
    // 1) Tenta o mapa local primeiro (instantâneo, sem rede)
    const achou = mapaColado.current[chaveMapa(num)];
    if (achou && (achou.cliente || achou.paciente)) {
      aplicarResultado(achou.cliente, achou.paciente);
      ultimaBusca.current = { numero: num, quando: Date.now() };
      return;
    }
    // 2) Fallback: busca individual no GAS (cobre base desatualizada / ação nova)
    // Evita buscar repetida do mesmo número em sequência (bip + efeito)
    const agora = Date.now();
    if (ultimaBusca.current.numero === num && agora - ultimaBusca.current.quando < 8000) return;
    ultimaBusca.current = { numero: num, quando: agora };
    setBuscando(true);
    try {
      const data = await gasGet(gasUrl.trim(), { action: "buscar", numero_doc: num });
      const cli = String(data.cliente_hospital || "");
      const pacRaw = String(data.paciente || "");
      const pac = pacRaw === "N/D" ? "" : pacRaw;
      aplicarResultado(cli, pac);
    } catch (e) {
      // silencioso — sem aviso na tela
    } finally {
      setBuscando(false);
    }
  }

  useEffect(() => {
    if (buscaTimer.current) clearTimeout(buscaTimer.current);
    const num = form.numero_doc.trim();
    if (!num) return;
    buscaTimer.current = setTimeout(() => buscarNaColado(num), 300);
    return () => {
      if (buscaTimer.current) clearTimeout(buscaTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.numero_doc]);

  function validar() {
    if (!form.codigo_barras.trim()) return "Campo Código de barras é obrigatório";
    if (!form.numero_doc.trim()) return "Campo Nota é obrigatório *";
    if (!form.cliente_hospital.trim()) return "Campo Cliente/Hospital é obrigatório";
    if (!form.tipo_devolucao.trim()) return "Campo Tipo devolução é obrigatório";
    if (!gasUrl.includes("/exec")) return "Configure a URL do GAS primeiro";
    return "";
  }

  async function salvar(e) {
    if (e) e.preventDefault();
    const erro = validar();
    if (erro) {
      showToast(erro, "erro");
      return;
    }
    setSaving(true);
    try {
      const base = gasUrl.trim();
      if (editId) {
        await gasGet(base, {
          action: "editar",
          id: editId,
          codigo_barras: form.codigo_barras.trim(),
          tipo_doc: form.tipo_doc,
          numero_doc: form.numero_doc.trim(),
          cliente_hospital: form.cliente_hospital.trim(),
          paciente: form.paciente.trim() || "N/D",
          tipo_devolucao: form.tipo_devolucao,
          observacao: form.observacao.trim(),
          usuario: usuario.trim(),
        });
        showToast("Protocolo atualizado ✓");
      } else {
        await gasGet(base, {
          action: "salvar",
          codigo_barras: form.codigo_barras.trim(),
          escolha: form.tipo_doc,
          tipo_doc: form.tipo_doc,
          numero_doc: form.numero_doc.trim(),
          cliente_hospital: form.cliente_hospital.trim(),
          paciente: form.paciente.trim() || "N/D",
          tipo_devolucao: form.tipo_devolucao,
          observacao: form.observacao.trim(),
          status: STATUS_PADRAO,
          usuario: usuario.trim(),
        });
        showToast(`Doc. ${form.numero_doc.trim()} protocolado ✓`);
      }
      setForm(vazio);
      setEditId(null);
      lastAuto.current = { cliente: "", paciente: "" };
      await carregar(base);
      barcodeRef.current?.focus();
    } catch (err) {
      showToast("Erro ao salvar: " + (err.message || String(err)), "erro");
    } finally {
      setSaving(false);
    }
  }

  function editar(item) {
    setEditId(item.id);
    lastAuto.current = { cliente: "", paciente: "" };
    setForm({
      codigo_barras: item.codigo_barras || "",
      tipo_doc: item.tipo_doc || "NOTA",
      numero_doc: item.numero_doc || "",
      cliente_hospital: item.cliente_hospital || "",
      paciente: item.paciente === "N/D" ? "" : item.paciente || "",
      tipo_devolucao: item.tipo_devolucao || "",
      observacao: item.observacao || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    barcodeRef.current?.focus();
  }

  function cancelarEdicao() {
    setEditId(null);
    setForm(vazio);
    lastAuto.current = { cliente: "", paciente: "" };
  }

  async function carregarClientes(url) {
    const base = (url || gasUrl).trim();
    if (!base || !base.includes("/exec")) return;
    try {
      const r = await gasGet(base, { action: "listarClientes" });
      setListaClientes(r.dados || []);
    } catch {
      // ignora se ação ainda não existir no GAS
    }
  }

  async function abrirModalCliente() {
    setShowClienteModal(true);
    setNovoCliente("");
    await carregarClientes();
  }

  async function salvarNovoCliente(e) {
    e.preventDefault();
    const nome = novoCliente.trim();
    if (!nome) {
      showToast("Informe o nome do Cliente/Hospital", "erro");
      return;
    }
    setSavingCliente(true);
    try {
      await gasGet(gasUrl.trim(), { action: "salvarCliente", cliente_hospital: nome });
      showToast(`"${nome}" cadastrado ✓`);
      setNovoCliente("");
      setListaClientes((l) => [...l, nome].sort((a, b) => a.localeCompare(b)));
      set("cliente_hospital", nome);
    } catch (err) {
      showToast(err.message || String(err), "erro");
    } finally {
      setSavingCliente(false);
    }
  }

  async function excluir(item) {
    if (!confirm(`Excluir doc. ${item.numero_doc} (${item.cliente_hospital})?`)) return;
    try {
      await gasGet(gasUrl.trim(), { action: "excluir", id: item.id });
      showToast("Protocolo excluído");
      await carregar(gasUrl);
    } catch (err) {
      showToast("Erro ao excluir: " + err.message, "erro");
    }
  }

  function salvarGasUrl() {
    const url = gasUrl.trim();
    localStorage.setItem("mentor_gas_url", url);
    localStorage.setItem("mentor_usuario", usuario.trim());
    setShowConfig(false);
    if (url.includes("/exec")) carregar(url);
  }

  const filtrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((r) =>
      [r.numero_doc, r.cliente_hospital, r.paciente, r.observacao, r.status, r.tipo_doc, r.tipo_devolucao]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [lista, busca]);

  function onBarcodeKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      salvar();
    }
  }

  return (
    <div className="mentor-page">
      {/* TOPO */}
      <header className="mentor-topo">
        <div className="mentor-topo-left">
          <div className="mentor-logo">✉</div>
          <span className="mentor-titulo">Protocolo Mentor</span>
        </div>
        <div className="mentor-topo-right">
          <div className="mentor-busca">
            <span>🔍</span>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar"
              aria-label="Pesquisar"
            />
          </div>
          <div className="mentor-user" title="Usuário do protocolo">
            <span>👤</span>
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              onBlur={salvarGasUrl}
              aria-label="Usuário"
            />
          </div>
        </div>
      </header>

      {/* SUBTITULO */}
      <div className="mentor-sub">
        <span>{editId ? "Editar protocolo" : "Protocolar nota remessa/vale"}</span>
        <span className="mentor-count">{filtrada.length} registro(s)</span>
      </div>

      {/* CONFIG GAS */}
      {showConfig || !gasUrl.includes("/exec") ? (
        <div className="mentor-config">
          <label>URL do GAS (colar 1 vez só)</label>
          <div className="mentor-config-row">
            <input
              type="text"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={gasUrl}
              onChange={(e) => setGasUrl(e.target.value)}
            />
            <button type="button" onClick={salvarGasUrl}>Salvar</button>
          </div>
          <small>
            Apps Script da planilha → Deploy → Aplicativo da web → acesso “Qualquer pessoa”.
            Ou defina <b>NEXT_PUBLIC_GAS_URL</b> na Vercel.
          </small>
        </div>
      ) : null}

      {/* FORM */}
      <form className="mentor-form" onSubmit={salvar}>
        <div className="f-row">
          <div className="f-col full">
            <label>Código de barras <b className="req">*</b></label>
            <input
              ref={barcodeRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Bipe ou digite e tecle ENTER"
              value={form.codigo_barras}
              onChange={(e) => set("codigo_barras", e.target.value)}
              onKeyDown={onBarcodeKeyDown}
              required
            />
          </div>
        </div>

        <div className="f-row">
          <div className="f-col small">
            <label>Escolha</label>
            <select value={form.tipo_doc} onChange={(e) => set("tipo_doc", e.target.value)}>
              {TIPO_DOC_OPTS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="f-col tiny">
            <label>Nota <b className="req">*</b></label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Nº"
              value={form.numero_doc}
              onChange={(e) => set("numero_doc", e.target.value)}
              required
            />
          </div>
          <div className="f-col grow">
            <label>Cliente/Hospital</label>
            <div className="input-icone cli-autocomplete">
              <input
                ref={cliInputRef}
                type="text"
                placeholder="Nome do cliente ou hospital"
                value={form.cliente_hospital}
                onChange={(e) => {
                  set("cliente_hospital", e.target.value);
                  setCliFiltro(e.target.value);
                  setShowCliSug(true);
                }}
                onFocus={() => { setCliFiltro(form.cliente_hospital); setShowCliSug(true); }}
                onBlur={() => setTimeout(() => setShowCliSug(false), 150)}
                required
              />
              <button type="button" title="Cadastrar novo Cliente/Hospital" onClick={abrirModalCliente}>➕</button>
              {showCliSug && cliSugestoes.length > 0 && (
                <ul className="cli-sugestoes">
                  {cliSugestoes.map((c, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          set("cliente_hospital", c);
                          setShowCliSug(false);
                          cliInputRef.current?.focus();
                        }}
                      >
                        {c}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="f-col grow">
            <label>Paciente</label>
            <input
              type="text"
              placeholder="Nome do paciente"
              value={form.paciente}
              onChange={(e) => set("paciente", e.target.value)}
            />
          </div>
        </div>

        <div className="f-row">
          <div className="f-col mid">
            <label>Tipo devolução <b className="req">*</b></label>
            <select value={form.tipo_devolucao} onChange={(e) => set("tipo_devolucao", e.target.value)}>
              {TIPO_DEVOLUCAO_OPTS.map((o, i) => (
                <option key={i} value={o}>{o === "" ? "— selecione —" : o}</option>
              ))}
            </select>
          </div>
          <div className="f-col save">
            <button type="submit" className="btn-salvar" disabled={saving}>
              💾 {saving ? "Salvando..." : editId ? "Atualizar" : "Salvar"}
            </button>
            {editId && (
              <button type="button" className="btn-cancelar" onClick={cancelarEdicao}>
                Cancelar
              </button>
            )}
          </div>
          <div className="f-col grow">
            <label>Observação</label>
            <input
              type="text"
              placeholder="Observação (opcional)"
              value={form.observacao}
              onChange={(e) => set("observacao", e.target.value)}
            />
          </div>
        </div>
      </form>

      {/* TABELA */}
      <div className="mentor-tabela-wrap">
        <table className="mentor-tabela">
          <thead>
            <tr>
              <th style={{ width: 50 }}>Item</th>
              <th style={{ width: 80 }}>Doc.</th>
              <th>Hospital/Cliente</th>
              <th>Paciente/Cliente</th>
              <th style={{ width: 190 }}>Status</th>
              <th style={{ width: 110 }}>Data protocolo</th>
              <th>Observação</th>
              <th style={{ width: 90 }}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 20 }}>Carregando...</td></tr>
            ) : filtrada.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 20 }}>Nenhum protocolo encontrado</td></tr>
            ) : (
              filtrada.map((r, i) => (
                <tr key={r.id || i} className={editId === r.id ? "em-edicao" : ""}>
                  <td className="c">{filtrada.length - i}</td>
                  <td><b>{r.numero_doc}</b></td>
                  <td>{r.cliente_hospital}</td>
                  <td>{r.paciente}</td>
                  <td className="status">{r.tipo_devolucao || r.status || STATUS_PADRAO}</td>
                  <td className="c">{formatarData(r.data_protocolo)}</td>
                  <td>{r.observacao}</td>
                  <td className="c acoes">
                    <span className="acoes-row">
                      <button title="Editar" onClick={() => editar(r)}>✏️</button>
                      <button title="Excluir" onClick={() => excluir(r)}>🗑️</button>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="mentor-rodape">
        <button className="link" onClick={() => setShowConfig((v) => !v)}>
          ⚙️ {showConfig ? "Ocultar config." : "Config. GAS / usuário"}
        </button>
        <button className="link" onClick={() => { if (gasUrl.includes("/exec")) { carregar(gasUrl); carregarMapa(gasUrl); } }}>
          ↻ Atualizar lista
        </button>
      </footer>

      {showClienteModal && (
        <div className="modal-overlay" onClick={() => setShowClienteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-topo">
              <span>Cadastro de Cliente/Hospital</span>
              <button type="button" className="modal-x" onClick={() => setShowClienteModal(false)}>✕</button>
            </div>
            <form onSubmit={salvarNovoCliente} className="modal-corpo">
              <label>Cliente/Hospital</label>
              <div className="modal-row">
                <input
                  type="text"
                  placeholder="Nome do cliente ou hospital"
                  value={novoCliente}
                  onChange={(e) => setNovoCliente(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn-salvar" disabled={savingCliente}>
                  💾 {savingCliente ? "Salvando..." : "Salvar"}
                </button>
              </div>
              {listaClientes.length > 0 && (
                <div className="modal-lista">
                  <label>Cadastrados ({listaClientes.length})</label>
                  <ul>
                    {listaClientes.map((c, i) => (
                      <li key={i}>
                        <button type="button" onClick={() => { set("cliente_hospital", c); setShowClienteModal(false); }}>
                          {c}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className={`toast toast-${toast.tipo}`} onClick={() => setToast(null)}>
          {toast.texto}
        </div>
      )}
    </div>
  );
}
