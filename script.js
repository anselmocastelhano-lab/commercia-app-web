// ==================================================================
// COMMERCIA IA — App Web · MVP v1.0
// Arquitetura: Modo Cliente (F1-F10) + Modo REP (F11-F16)
// ==================================================================

// ── CONFIG ────────────────────────────────────────────────────────
const GOOGLE_PLACES_KEY  = 'AIzaSyCkfNpf_8dtN9zYA0RFr7tckzx9Is8Pjtk';
const GOOGLE_TTS_KEY     = 'AIzaSyCuaIFN89QXIa73_M0fYJSQlIfKBTyx0nM';
const CIDADE_PILOTO      = 'Porto Alegre, RS';

// ── PONTO DE PARTIDA FIXO (Rep Location) ──────────────────────────
// Av. Protásio Alves, 1472 - Petrópolis, Porto Alegre - RS, 90410-005
const REP_LOCATION = {
    endereco: 'Av. Protásio Alves, 1472',
    bairro: 'Petrópolis',
    cidade: 'Porto Alegre',
    estado: 'RS',
    cep: '90410-005'
};

// ── BACKEND (FastAPI + Evolution API) ─────────────────────────────
// Trocar pela URL real do Railway quando disponível
const BACKEND_URL = 'https://commercia-ia-mvp-production.up.railway.app';

// ── SUPABASE ──────────────────────────────────────────────────────
const SUPABASE_URL = 'https://hmkzsvwgswxgkjgbcasa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhta3pzdndnc3d4Z2tqZ2JjYXNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4MTI3ODAsImV4cCI6MjA3NDM4ODc4MH0.EqkGfralC8wTC7JbsfkRmmHW29pK61Z6auth0eICEPA';

async function fetchClientesFromSupabase() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/clientes?select=*`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Erro ao buscar clientes:', response.status);
            return null;
        }

        const data = await response.json();
        return data.map(c => ({
            id: c.id,
            nome: c.nome_loja,
            contato: c.nome_comprador || 'Sem contato',
            endereco: c.endereco,
            bairro: c.bairro,
            cidade: c.cidade,
            estado: c.estado,
            cep: c.cep,
            whatsapp: c.whatsapp_comprador || c.whatsapp_numero || c.whatsapp_proprietario || '',
            cnpj: c.cnpj || '',
            segmento: c.segmento || '',
            observacoes: c.observacoes_perfil || '',
            status: 'active'
        }));
    } catch (error) {
        console.error('Erro ao conectar Supabase:', error);
        return null;
    }
}

let repData = null;

async function fetchRepFromSupabase() {
    try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/usuarios_reps?select=id,nome,email,telefone&limit=1`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
            }
        });
        if (!resp.ok) return null;
        const rows = await resp.json();
        return rows.length > 0 ? rows[0] : null;
    } catch (e) {
        console.error('[fetchRep]', e);
        return null;
    }
}

async function fetchProdutosFromSupabase() {
    try {
        const resp = await fetch(
            `${SUPABASE_URL}/rest/v1/produtos?select=id,codigo,nome,categoria,unidade_venda,preco_cx,preco_kg,preco_pct,preco_un,preco_fd,estoque_status,ativo&ativo=eq.true&order=categoria,nome`,
            { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        if (!resp.ok) { console.error('[fetchProdutos] HTTP', resp.status); return; }
        const rows = await resp.json();
        produtos = rows;
        console.log(`[fetchProdutos] ${produtos.length} produtos carregados`);
    } catch (e) {
        console.error('[fetchProdutos]', e);
    }
}

async function savePedidoToSupabase(clienteId, repId) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/pedidos`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify({ cliente_id: clienteId, rep_id: repId, status: 'pre-pedido' })
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const [row] = await resp.json();
    return row;
}

async function fetchMixClienteFromSupabase(clienteId) {
    const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/mix_cliente?cliente_id=eq.${clienteId}&select=categoria&order=criado_em`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const rows = await resp.json();
    return rows.map(r => r.categoria);
}

async function addMixCategoriasToSupabase(clienteId, categorias) {
    const body = categorias.map(cat => ({ cliente_id: clienteId, categoria: cat }));
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/mix_cliente`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
}

async function saveRepToSupabase() {
    if (!repData?.id) return;
    const telefone = document.getElementById('repTelefone').value.trim();
    const email = document.getElementById('repEmail').value.trim();
    try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/usuarios_reps?id=eq.${repData.id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
            },
            body: JSON.stringify({ telefone, email }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const [updated] = await resp.json();
        repData = updated;
        const btn = document.getElementById('repModalSave');
        btn.classList.add('saved');
        setTimeout(() => btn.classList.remove('saved'), 1200);
    } catch (e) {
        console.error('[saveRep]', e);
        alert('Erro ao salvar perfil do representante.');
    }
}

function setupRepModal() {
    const overlay = document.getElementById('repModalOverlay');
    const closeBtn = document.getElementById('repModalClose');
    const saveBtn = document.getElementById('repModalSave');
    const userBtn = document.getElementById('userInfoBtn');

    userBtn.addEventListener('click', () => {
        document.getElementById('repTelefone').value = repData?.telefone || '';
        document.getElementById('repEmail').value = repData?.email || '';
        overlay.classList.add('open');
    });

    closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('open');
    });

    saveBtn.addEventListener('click', saveRepToSupabase);
}

// ── AGENDA (state + NLP + Supabase + GCal) ───────────────────────

let agendaState = null; // null | { cliente, waitingDateTime: true }

const NUM_WORDS = {
    'zero':0,'uma':1,'um':1,'duas':2,'dois':2,'três':3,'tres':3,'quatro':4,'cinco':5,
    'seis':6,'sete':7,'oito':8,'nove':9,'dez':10,'onze':11,'doze':12,'treze':13,
    'quatorze':14,'catorze':14,'quinze':15,'dezesseis':16,'dezessete':17,'dezoito':18,
    'dezenove':19,'vinte':20,'vinte e uma':21,'vinte e um':21,'vinte e duas':22,
    'vinte e dois':22,'vinte e três':23,'vinte e tres':23,
};

const MONTH_NAMES = {
    'janeiro':1,'fevereiro':2,'março':3,'marco':3,'abril':4,'maio':5,'junho':6,
    'julho':7,'agosto':8,'setembro':9,'outubro':10,'novembro':11,'dezembro':12,
};

const WEEKDAY_NAMES = {
    'domingo':0,'segunda':1,'segunda-feira':1,'terça':2,'terca':2,'terça-feira':2,
    'terca-feira':2,'quarta':3,'quarta-feira':3,'quinta':4,'quinta-feira':4,
    'sexta':5,'sexta-feira':5,'sábado':6,'sabado':6,
};

function replaceNumWords(text) {
    let t = text;
    const sorted = Object.keys(NUM_WORDS).sort((a, b) => b.length - a.length);
    for (const w of sorted) {
        t = t.replace(new RegExp(`\\b${w}\\b`, 'gi'), NUM_WORDS[w]);
    }
    return t;
}

function parseDateTimePtBR(input) {
    const raw = input.toLowerCase().trim();
    const text = replaceNumWords(raw);
    let date = null;
    let hours = null;
    let minutes = 0;

    const today = new Date();
    const yyyy = today.getFullYear();

    // "hoje"
    if (/\bhoje\b/.test(text)) {
        date = new Date(today);
    }

    // "amanhã"
    if (/amanh[aã]/i.test(text)) {
        date = new Date(today);
        date.setDate(date.getDate() + 1);
    }

    // "próxima segunda / terça / ..."
    const proxMatch = text.match(/pr[oó]xim[oa]?\s+([\wÀ-ſ-]+)/i);
    if (proxMatch) {
        const dayName = proxMatch[1].toLowerCase();
        const target = WEEKDAY_NAMES[dayName];
        if (target !== undefined) {
            date = new Date(today);
            let diff = target - today.getDay();
            if (diff <= 0) diff += 7;
            date.setDate(date.getDate() + diff);
        }
    }

    // weekday without "próxima" (e.g. "quarta às 14 horas")
    if (!date) {
        for (const [name, idx] of Object.entries(WEEKDAY_NAMES)) {
            if (text.includes(name)) {
                date = new Date(today);
                let diff = idx - today.getDay();
                if (diff <= 0) diff += 7;
                date.setDate(date.getDate() + diff);
                break;
            }
        }
    }

    // "dia DD de MES"
    const diaMonthMatch = text.match(/dia\s+(\d{1,2})\s+de\s+([\wÀ-ſ]+)/i);
    if (diaMonthMatch) {
        const d = parseInt(diaMonthMatch[1]);
        const m = MONTH_NAMES[diaMonthMatch[2].toLowerCase()];
        if (m) {
            date = new Date(yyyy, m - 1, d);
            if (date < today) date.setFullYear(yyyy + 1);
        }
    }

    // "dia DD" without month — assume current or next month
    if (!date) {
        const diaOnlyMatch = text.match(/dia\s+(\d{1,2})\b/);
        if (diaOnlyMatch) {
            const d = parseInt(diaOnlyMatch[1]);
            date = new Date(yyyy, today.getMonth(), d);
            if (date < today) {
                date.setMonth(date.getMonth() + 1);
            }
        }
    }

    // "DD/MM" or "DD/MM/YYYY"
    const slashMatch = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (slashMatch) {
        const d = parseInt(slashMatch[1]);
        const m = parseInt(slashMatch[2]);
        let y = slashMatch[3] ? parseInt(slashMatch[3]) : yyyy;
        if (y < 100) y += 2000;
        date = new Date(y, m - 1, d);
    }

    // ── Time parsing ──

    // "às HH:MM" or "HH:MM"
    const timeColonMatch = text.match(/(\d{1,2}):(\d{2})/);
    if (timeColonMatch) {
        hours = parseInt(timeColonMatch[1]);
        minutes = parseInt(timeColonMatch[2]);
    }

    // "às HH horas" / "N horas"
    if (hours === null) {
        const horasMatch = text.match(/(\d{1,2})\s*(?:h(?:oras?)?)\b/);
        if (horasMatch) hours = parseInt(horasMatch[1]);
    }

    // "N da manhã / da tarde / da noite"
    const periodoMatch = text.match(/(\d{1,2})\s*(?:h(?:oras?)?)?\s*da\s+(manh[aã]|tarde|noite)/i);
    if (periodoMatch) {
        hours = parseInt(periodoMatch[1]);
        const periodo = periodoMatch[2].toLowerCase();
        if ((periodo.startsWith('tarde') || periodo.startsWith('noite')) && hours < 12) {
            hours += 12;
        }
    }

    // "meio-dia"
    if (/meio[\s-]?dia/.test(text)) hours = 12;

    // "e meia" → +30 min
    if (/e\s+meia/.test(text) && hours !== null) minutes = 30;

    if (!date && !hours && hours !== 0) return null;

    const dateStr = date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        : null;
    const timeStr = hours !== null
        ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
        : null;

    if (!dateStr || !timeStr) return { dateStr, timeStr, partial: true };
    return { dateStr, timeStr, partial: false };
}

function formatDatePtBR(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

async function checkAgendaConflict(repId, dateStr, timeStr) {
    try {
        const resp = await fetch(
            `${SUPABASE_URL}/rest/v1/agenda_visitas?rep_id=eq.${repId}&data_visita=eq.${dateStr}&hora_visita=eq.${timeStr}&status=eq.agendado&select=id,hora_visita,cliente_id`,
            { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        if (!resp.ok) return [];
        return await resp.json();
    } catch (e) {
        console.error('[checkConflict]', e);
        return [];
    }
}

async function saveAgendaToSupabase(clienteId, repId, dateStr, timeStr) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/agenda_visitas`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        },
        body: JSON.stringify({
            rep_id: repId,
            cliente_id: clienteId,
            data_visita: dateStr,
            hora_visita: timeStr,
            status: 'agendado',
        }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const [row] = await resp.json();
    return row;
}

function buildGcalEventUrl(clienteNome, endereco, dateStr, timeStr) {
    const [y, m, d] = dateStr.split('-');
    const [hh, mm] = timeStr.split(':');
    const startDt = `${y}${m}${d}T${hh}${mm}00`;
    let endMinTotal = parseInt(hh) * 60 + parseInt(mm) + 30;
    let endHInt = Math.floor(endMinTotal / 60);
    let endMInt = endMinTotal % 60;
    let endDatePart = `${y}${m}${d}`;
    // Trata overflow de meia-noite (ex: 23:45 + 30min → dia seguinte 00:15)
    if (endHInt >= 24) {
        endHInt -= 24;
        const next = new Date(parseInt(y), parseInt(m) - 1, parseInt(d) + 1);
        endDatePart = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2,'0')}${String(next.getDate()).padStart(2,'0')}`;
    }
    const endH = String(endHInt).padStart(2, '0');
    const endM = String(endMInt).padStart(2, '0');
    const endDt = `${endDatePart}T${endH}${endM}00`;
    const title = encodeURIComponent(`Visita — ${clienteNome}`);
    const location = encodeURIComponent(endereco || '');
    const details = encodeURIComponent(`Visita comercial agendada via Commercia IA`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDt}/${endDt}&location=${location}&details=${details}`;
}

function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function fetchAgendaRows(dateStr) {
    const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/agenda_visitas?rep_id=eq.${repData.id}&data_visita=eq.${dateStr}&status=eq.agendado&select=hora_visita,cliente_id&order=hora_visita.asc`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    if (!resp.ok) return [];
    return await resp.json();
}

function renderAgendaSection(containerId, rows) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const title = container.querySelector('.section-title').outerHTML;
    let html = title;
    if (rows.length === 0) {
        html += '<div class="agenda-item"><div class="agenda-text" style="color:var(--gray-400)">Nenhuma visita agendada</div></div>';
    } else {
        for (const row of rows) {
            const cliente = clientes.find(c => c.id === row.cliente_id);
            const nome = cliente ? cliente.nome : 'Cliente';
            const hora = row.hora_visita ? row.hora_visita.slice(0, 5) : '--:--';
            html += `<div class="agenda-item"><div class="agenda-time">${hora}</div><div class="agenda-text">${nome}</div></div>`;
        }
    }
    container.innerHTML = html;
}

async function refreshAgendaHoje() {
    if (!repData?.id) return;
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    try {
        const [rowsHoje, rowsAmanha] = await Promise.all([
            fetchAgendaRows(toDateStr(hoje)),
            fetchAgendaRows(toDateStr(amanha)),
        ]);

        // VISITAS HOJE counter
        const visitasEl = document.getElementById('visitasHojeCount');
        if (visitasEl) visitasEl.textContent = rowsHoje.length;

        // Render AGENDA DE HOJE (first .dashboard-section)
        const containerHoje = document.querySelector('.dashboard-section');
        if (containerHoje) {
            const titleEl = containerHoje.querySelector('.section-title');
            let html = titleEl ? titleEl.outerHTML : '<div class="section-title">AGENDA DE HOJE</div>';
            if (rowsHoje.length === 0) {
                html += '<div class="agenda-item"><div class="agenda-text" style="color:var(--gray-400)">Nenhuma visita agendada</div></div>';
            } else {
                for (const row of rowsHoje) {
                    const cliente = clientes.find(c => c.id === row.cliente_id);
                    const nome = cliente ? cliente.nome : 'Cliente';
                    const hora = row.hora_visita ? row.hora_visita.slice(0, 5) : '--:--';
                    html += `<div class="agenda-item"><div class="agenda-time">${hora}</div><div class="agenda-text">${nome}</div></div>`;
                }
            }
            containerHoje.innerHTML = html;
        }

        // Render AGENDA DE AMANHÃ
        renderAgendaSection('agendaAmanha', rowsAmanha);

    } catch (e) {
        console.error('[refreshAgendaHoje]', e);
    }
}

async function processAgendaInput(cmd) {
    const parsed = parseDateTimePtBR(cmd);

    if (!parsed) {
        addMessage('assistant', `⚠️ Não consegui identificar a data/hora.\n\nExemplos válidos:\n• "Hoje 14:00"\n• "Amanhã às 10 horas"\n• "Próxima quarta 15:30"\n• "Dia 20 de maio 3 da tarde"\n• "22/05 09:00"`);
        return;
    }

    if (parsed.partial) {
        if (!parsed.dateStr) {
            addMessage('assistant', `⚠️ Informe também a **data** da visita.\nEx: "Hoje", "Amanhã", "Dia 20 de maio", "22/05"`);
            return;
        }
        if (!parsed.timeStr) {
            addMessage('assistant', `⚠️ Informe também o **horário** da visita.\nEx: "14:00", "3 da tarde", "10 horas"`);
            return;
        }
    }

    const { dateStr, timeStr } = parsed;
    const cliente = agendaState.cliente;
    const isLead  = agendaState.isLead === true;

    addMessage('assistant', '⏳ Verificando conflitos de agenda...');

    try {
        const conflicts = isLead ? [] : await checkAgendaConflict(repData.id, dateStr, timeStr);
        if (conflicts.length > 0) {
            const conflictCliente = clientes.find(c => c.id === conflicts[0].cliente_id);
            const conflictNome = conflictCliente ? conflictCliente.nome : 'outro cliente';
            addMessage('assistant', `⚠️ Conflito de horário!\n\nJá existe uma visita agendada para **${formatDatePtBR(dateStr)}** às **${timeStr}** com **${conflictNome}**.\n\nInforme outra data/hora para ${cliente.nome}:`);
            return;
        }

        if (!isLead) await saveAgendaToSupabase(cliente.id, repData.id, dateStr, timeStr);

        const enderecoCompleto = [cliente.endereco, cliente.bairro, cliente.cidade, cliente.estado].filter(Boolean).join(', ');
        const gcalUrl = buildGcalEventUrl(cliente.nome, enderecoCompleto, dateStr, timeStr);

        agendaState = null;

        addMessage('assistant',
            `✅ Visita agendada!\n\n📅 Data: ${formatDatePtBR(dateStr)}\n🕐 Horário: ${timeStr}\n\n📍 ${cliente.nome} — ${cliente.endereco}\n\n🔗 <a href="${gcalUrl}" target="_blank" rel="noopener" style="color:var(--teal);text-decoration:underline;">Adicionar ao Google Calendar</a>`,
            true);

        await refreshAgendaHoje();

    } catch (e) {
        console.error('[processAgenda]', e);
        addMessage('assistant', '❌ Erro ao salvar agenda. Tente novamente.');
    }
}

// ── MODO LEAD ─────────────────────────────────────────────────────

let leads = [];
let selectedLead = null;
let novoLeadState = null;

const NOVO_LEAD_CAMPOS = [
    { key: 'nome',     label: 'Nome do estabelecimento', hint: '' },
    { key: 'contato',  label: 'Contato (nome)',          hint: '' },
    { key: 'whatsapp', label: 'Telefone / WhatsApp',     hint: 'Somente números com DDD. Ex: 51999999999' },
    { key: 'endereco', label: 'Endereço',                hint: 'Ex: Rua das Flores, 123 — Bairro' },
    { key: 'cidade',   label: 'Cidade',                  hint: 'Ex: Porto Alegre' },
    { key: 'segmento', label: 'Segmento',                hint: 'restaurante / churrascaria / buffet / lanchonete / outro' },
];

async function fetchLeadsFromSupabase() {
    try {
        const resp = await fetch(
            `${SUPABASE_URL}/rest/v1/leads?select=*&status=neq.convertido&order=created_at.desc`,
            { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
        );
        if (!resp.ok) return [];
        const data = await resp.json();
        return data.map(l => ({
            id:       l.id,
            nome:     l.nome,
            contato:  l.whatsapp || 'Sem contato',
            endereco: l.endereco || '',
            bairro:   l.bairro   || '',
            cidade:   l.cidade   || '',
            estado:   'RS',
            cep:      '',
            whatsapp: l.whatsapp || '',
            segmento: l.segmento || '',
            status:   'lead',
            _raw:     l,
        }));
    } catch (e) {
        console.error('[fetchLeads]', e);
        return [];
    }
}

function renderLeadList(filter = '') {
    const list = document.getElementById('clientList');
    list.innerHTML = '';
    const counterEl = document.getElementById('clientCounterValue');
    if (counterEl) counterEl.textContent = leads.length;
    const term = filter.toLowerCase();
    leads
        .filter(l => !term || l.nome.toLowerCase().includes(term))
        .forEach(lead => {
            const el = document.createElement('div');
            el.className = `client-item${selectedLead && selectedLead.id === lead.id ? ' active' : ''}`;
            el.innerHTML = `
                <div class="client-item-name">${lead.nome}</div>
                <div class="client-item-contact">${lead.contato}</div>
                <div class="client-item-address">${lead.endereco || lead.cidade || ''}</div>
                <span class="client-status active" style="background:rgba(99,102,241,0.15);color:#a5b4fc;border-radius:4px;padding:2px 6px;font-size:10px;font-weight:700;">Lead</span>
            `;
            el.addEventListener('click', () => enterModoLead(lead));
            list.appendChild(el);
        });
}

function enterModoLead(lead = null) {
    currentMode  = 'lead';
    selectedLead = lead;

    // Badge
    const badge = document.getElementById('modeBadge');
    badge.dataset.mode = 'lead';
    document.getElementById('modeBadgeLabel').textContent = 'MODO LEAD';

    // Sidebar labels
    document.getElementById('sidebarTitle').textContent        = 'LEADS';
    document.getElementById('clientCounterLabel').textContent  = 'LEADS';
    document.getElementById('searchInput').placeholder         = 'Buscar lead...';
    // Sidebar buttons — Modo Lead: [Modo Cliente] + [Modo REP]
    document.getElementById('btnModoLead').style.display    = 'none';
    document.getElementById('btnModoCliente').style.display = 'flex';
    document.getElementById('btnModoGeral').style.display   = 'flex';

    renderLeadList();

    // Context header
    if (lead) {
        const initials = lead.nome.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
        document.getElementById('contextHeader').innerHTML = `
            <div class="ctx-cliente">
                <div class="ctx-avatar" style="background:rgba(99,102,241,0.2);color:#a5b4fc;">${initials}</div>
                <div class="ctx-info">
                    <div class="ctx-nome">${lead.nome}</div>
                    <div class="ctx-detalhes">${lead.contato} · ${lead.endereco || lead.cidade || 'Lead'}
                        <span class="ctx-status active" style="color:#818cf8;">● Lead</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        document.getElementById('contextHeader').innerHTML = `
            <div class="ctx-geral">
                <div class="ctx-avatar-geral">🎯</div>
                <div class="ctx-geral-info">
                    <div class="ctx-geral-title">Modo Lead</div>
                    <div class="ctx-geral-sub">Selecione um lead na lista para ativar o contexto</div>
                </div>
            </div>`;
    }

    // Action bar — sem lead: só Novo Lead; com lead: 4 botões de contexto (sem Novo Lead)
    const leadBtns = lead ? [
        { id: 'agendar-lead', icon: '📅', label: 'Agendar',          cmd: `Agendar visita para ${lead.nome}` },
        { id: 'rota-lead',    icon: '🗺️', label: 'Rota',            cmd: `Abrir rota até ${lead.nome}` },
        { id: 'reg-lead',     icon: '📝', label: 'Registrar Visita', cmd: `Registrar visita lead ${lead.nome}` },
        { id: 'incluir-cli',  icon: '✅', label: 'Incluir Cliente',  cmd: `Incluir ${lead.nome} como cliente` },
    ] : [
        { id: 'novo-lead',    icon: '👤', label: 'Novo Lead',        cmd: 'Cadastrar novo lead' },
    ];
    renderActionBar(leadBtns);

    loadMessageHistory();
}

function askNovoLeadField(stepIndex) {
    const campo = NOVO_LEAD_CAMPOS[stepIndex];
    const total = NOVO_LEAD_CAMPOS.length;
    const hintLine = campo.hint ? `\n   ${campo.hint}` : '';
    addMessage('assistant', `🎯 Cadastro de Novo Lead\nCampo ${stepIndex + 1} de ${total}\n\n• ${campo.label}:${hintLine}`);
}

function processNovoLeadStep(input) {
    const campo = NOVO_LEAD_CAMPOS[novoLeadState.step];
    const val   = input.trim();

    if (campo.key === 'whatsapp') {
        const nums = val.replace(/\D/g, '');
        if (nums.length < 10) {
            addMessage('assistant', `⚠️ Número inválido — informe com DDD (mínimo 10 dígitos).\n   ${campo.hint}`);
            return;
        }
        novoLeadState.dados[campo.key] = nums;
    } else {
        novoLeadState.dados[campo.key] = val;
    }

    novoLeadState.step++;
    if (novoLeadState.step >= NOVO_LEAD_CAMPOS.length) {
        const dados = novoLeadState.dados;
        novoLeadState = null;
        saveNovoLeadToSupabase(dados);
    } else {
        askNovoLeadField(novoLeadState.step);
    }
}

async function saveNovoLeadToSupabase(dados) {
    addMessage('assistant', '⏳ Cadastrando lead...');
    const body = {
        nome:     dados.nome,
        whatsapp: dados.whatsapp || null,
        endereco: dados.endereco || null,
        cidade:   dados.cidade  || 'Porto Alegre',
        segmento: dados.segmento ? dados.segmento.toLowerCase() : null,
        source:   'rep_manual',
        status:   'novo',
        rep_id:   repData?.id || null,
    };
    try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
            method: 'POST',
            headers: {
                'apikey':        SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type':  'application/json',
                'Prefer':        'return=representation',
            },
            body: JSON.stringify(body),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const [novoLead] = await resp.json();

        const leadObj = {
            id:       novoLead.id,
            nome:     novoLead.nome,
            contato:  dados.contato || novoLead.whatsapp || 'Sem contato',
            endereco: novoLead.endereco || '',
            bairro:   '',
            cidade:   novoLead.cidade  || '',
            estado:   'RS',
            cep:      '',
            whatsapp: novoLead.whatsapp || '',
            segmento: novoLead.segmento || '',
            status:   'lead',
            _raw:     novoLead,
        };
        leads.push(leadObj);
        renderLeadList();

        addMessage('assistant',
            `✅ Lead cadastrado com sucesso!\n\n📋 Resumo:\n• Nome: ${dados.nome}\n• Contato: ${dados.contato || '—'}\n• WhatsApp: ${dados.whatsapp || '—'}\n• Endereço: ${dados.endereco || '—'}\n• Cidade: ${dados.cidade}\n• Segmento: ${dados.segmento || '—'}\n\nLead adicionado à lista.`,
            true);
    } catch (e) {
        console.error('[saveNovoLead]', e);
        leads.push({
            id: Date.now(), nome: dados.nome, contato: dados.contato || 'Sem contato',
            endereco: dados.endereco || '', bairro: '', cidade: dados.cidade || '',
            estado: 'RS', cep: '', whatsapp: dados.whatsapp || '',
            segmento: dados.segmento || '', status: 'lead', _raw: null,
        });
        renderLeadList();
        addMessage('assistant',
            `✅ Lead cadastrado localmente!\n\n• Nome: ${dados.nome}\n\n⚠️ Erro ao salvar no servidor — dados registrados localmente.`);
    }
}

async function convertLeadToCliente(lead) {
    addMessage('assistant', `⏳ Convertendo ${lead.nome} para cliente...`);
    try {
        const body = {
            nome_loja:       lead.nome,
            whatsapp_numero: lead.whatsapp || null,
            endereco:        lead.endereco || null,
            bairro:          lead.bairro   || null,
            cidade:          lead.cidade   || 'Porto Alegre',
            estado:          lead.estado   || 'RS',
            segmento:        lead.segmento || null,
            rep_id:          repData?.id   || null,
        };
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/clientes`, {
            method: 'POST',
            headers: {
                'apikey':        SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type':  'application/json',
                'Prefer':        'return=representation',
            },
            body: JSON.stringify(body),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const [newClient] = await resp.json();

        // Mark lead as convertido
        if (lead._raw?.id) {
            await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${lead._raw.id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 'convertido' }),
            });
        }

        // Update local arrays
        clientes.push({
            id:       newClient.id,
            nome:     newClient.nome_loja,
            contato:  lead.contato || 'Sem contato',
            endereco: newClient.endereco || '',
            bairro:   newClient.bairro   || '',
            cidade:   newClient.cidade   || 'Porto Alegre',
            estado:   'RS',
            cep:      newClient.cep     || '',
            whatsapp: lead.whatsapp     || '',
            status:   'active',
        });
        leads = leads.filter(l => l.id !== lead.id);

        addMessage('assistant',
            `✅ ${lead.nome} incluído na carteira de clientes!\n\nCliente já disponível na carteira do REP.\nSelecione-o na lista de clientes para ativar o Modo Cliente.`,
            true);
        enterModoGeral();
    } catch (e) {
        console.error('[convertLead]', e);
        addMessage('assistant', `❌ Erro ao converter lead. Tente novamente.`);
    }
}

// ── MOCK DATA ─────────────────────────────────────────────────────

let clientes = [
    { id: 1, nome: 'Restaurante Sabor do Sul', contato: 'João Silva',     endereco: 'Rua dos Andradas, 736',   bairro: 'Centro', cidade: 'Porto Alegre', estado: 'RS', cep: '90010-150', status: 'active' },
    { id: 2, nome: 'Churrascaria Gaúcha',      contato: 'Maria Oliveira', endereco: 'Av. Ipiranga, 1500',      bairro: 'Centro', cidade: 'Porto Alegre', estado: 'RS', cep: '90160-094', status: 'vip'    },
    { id: 3, nome: 'Pizzaria Don Carlo',        contato: 'Pietro Rossi',   endereco: 'Rua Padre Chagas, 312',   bairro: 'Centro', cidade: 'Porto Alegre', estado: 'RS', cep: '90130-100', status: 'active' },
    { id: 4, nome: 'Lanchonete Express',        contato: 'Ana Ferreira',   endereco: 'Av. Farrapos, 800',       bairro: 'Floresta', cidade: 'Porto Alegre', estado: 'RS', cep: '90050-170', status: 'active' },
    { id: 5, nome: 'Buffet Sabores',            contato: 'Roberto Costa',  endereco: 'Av. Osvaldo Aranha, 440', bairro: 'Bom Fim', cidade: 'Porto Alegre', estado: 'RS', cep: '90035-190', status: 'active' },
];

let produtos = []; // Carregado do Supabase em DOMContentLoaded

const mockHistorico = {
    1: [ { data: '08/05', pedido: 'P-2041', valor: 'R$ 3.200', itens: 'Frango Inteiro 50cx, Coxa 20cx' },
         { data: '24/04', pedido: 'P-1987', valor: 'R$ 1.800', itens: 'Filé de Frango 20cx, Linguiça 10cx' } ],
    2: [ { data: '09/05', pedido: 'P-2055', valor: 'R$ 6.200', itens: 'Picanha 10cx, Contrafilé 15cx, Carne Moída 5cx' },
         { data: '02/05', pedido: 'P-1999', valor: 'R$ 4.100', itens: 'Picanha 8cx, Costela Suína 12cx' } ],
    3: [ { data: '07/05', pedido: 'P-2030', valor: 'R$ 2.450', itens: 'Queijo Mussarela 30cx, Linguiça 15cx' } ],
    4: [ { data: '06/05', pedido: 'P-2015', valor: 'R$ 1.200', itens: 'Frango Inteiro 20cx, Carne Moída 10cx' } ],
    5: [ { data: '09/05', pedido: 'P-2058', valor: 'R$ 5.400', itens: 'Queijo Mussarela 50cx, Frango 40cx, Filé 15cx' },
         { data: '01/05', pedido: 'P-1970', valor: 'R$ 3.800', itens: 'Frango Inteiro 60cx, Queijo 30cx' } ],
};

// ── STATE ─────────────────────────────────────────────────────────

let currentMode   = 'geral';       // 'geral' | 'cliente'
let selectedClient = null;
let voicePhase      = 'off';        // 'off' | 'standby' | 'active' | 'processing'
let recognition     = null;         // único reconhecedor contínuo (wake + cmd)
let awaitingCommand = false;        // true após wake word — aguardando comando
let ttsActive       = false;        // true enquanto TTS fala — bloqueia eco do microfone
let currentAudio    = null;         // elemento Audio ativo do Google TTS
let outputMode      = 'texto-voz';  // 'texto' | 'texto-voz' | 'voz'
let ttsVoice       = null;
let messageHistory  = {};           // { 'geral': [...], clientId: [...] }
let novoClienteState = null;        // null = inativo | { step, dados }

const NOVO_CLIENTE_CAMPOS = [
    { key: 'nome_loja',      label: 'Nome do estabelecimento',     hint: '' },
    { key: 'nome_comprador', label: 'Contato (nome do comprador)',  hint: '' },
    { key: 'whatsapp',       label: 'Telefone / WhatsApp',          hint: 'Somente números com DDD. Ex: 51999999999' },
    { key: 'endereco',       label: 'Endereço',                     hint: 'Ex: Rua das Flores, 123 — Bairro' },
    { key: 'cep',            label: 'CEP',                          hint: 'Formato: 00000-000. Ex: 90010-150' },
    { key: 'tipo',           label: 'Segmento',                     hint: 'restaurante / churrascaria / buffet / lanchonete / outro' },
    { key: 'mix',            label: 'Mix de produtos',              hint: 'Categorias: Aves, Bovinos, Queijos, Embutidos, Pescados, Frios\nEx: "aves, bovinos, queijos"' },
    { key: 'observacoes',    label: 'Observações',                  hint: 'Frequência estimada, volume, preferências\nOu diga "pular" para deixar em branco' },
];

function stopAudio() {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    ttsActive = false;
}

// ── INIT ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    // Fetch real client data from Supabase
    const clientesSupabase = await fetchClientesFromSupabase();
    if (clientesSupabase && clientesSupabase.length > 0) {
        clientes = clientesSupabase;
    }

    repData = await fetchRepFromSupabase();
    await fetchProdutosFromSupabase();
    const leadsSupabase = await fetchLeadsFromSupabase();
    if (leadsSupabase) leads = leadsSupabase;
    renderClientList();
    setupSearchFilter();
    setupEventListeners();
    setupRepModal();
    refreshAgendaHoje();
    setupVoiceRecognition();
    setupTTS();
    setupOutputMode();
    loadCommerciaAvatar();
    enterModoGeral(true);
});

// ── MODE MANAGEMENT ───────────────────────────────────────────────

function enterModoGeral(isInit = false) {
    currentMode   = 'geral';
    selectedClient = null;

    // Badge
    const badge = document.getElementById('modeBadge');
    const label = document.getElementById('modeBadgeLabel');
    badge.dataset.mode = 'geral';
    label.textContent  = 'MODO REP';

    // Sidebar buttons
    document.getElementById('btnModoGeral').style.display   = 'none';
    document.getElementById('btnModoLead').style.display    = 'flex';
    document.getElementById('btnModoCliente').style.display = 'none';

    // Reset sidebar labels
    document.getElementById('sidebarTitle').textContent       = 'CARTEIRA DE CLIENTES';
    document.getElementById('clientCounterLabel').textContent = 'CLIENTES';
    document.getElementById('searchInput').placeholder        = 'Buscar cliente...';

    // Context header
    document.getElementById('contextHeader').innerHTML = `
        <div class="ctx-geral">
            <div class="ctx-avatar-geral" id="ctxAvatarGeral">🤖</div>
            <div class="ctx-geral-info">
                <div class="ctx-geral-title">Modo REP</div>
                <div class="ctx-geral-sub">Selecione um cliente na carteira para ativar o Modo Cliente</div>
            </div>
        </div>
    `;
    loadCommerciaAvatarToContext();

    // Action bar
    renderActionBar([
        { id: 'agenda',    icon: '📅', label: 'Agenda', cmd: 'Consultar minha agenda de hoje' },
        { id: 'produtos',  icon: '📦', label: 'Produtos', cmd: 'Ver tabela de preços' },
        { id: 'ofertas',   icon: '🏷️', label: 'Ofertas', cmd: 'Mostrar produtos em oferta' },
        { id: 'novo-cli',  icon: '👤', label: 'Novo Cliente', cmd: 'Cadastrar novo cliente' },
        { id: 'rotas',     icon: '🗺️', label: 'Rotas', cmd: 'Listar rotas do dia' },
    ]);

    // Load history for Modo REP
    loadMessageHistory();

    // Deselect client list
    renderClientList();

    // Show appropriate greeting based on context
    if (isInit) {
        // First load - show greeting without audio
        if (!messageHistory['geral']?.length) {
            addMessage('assistant', '🤖 Olá! Sou a Commercia IA, sua assistente comercial de vendas.\n\nDiga "Commercia!" ou selecione um cliente na carteira para começar.', true);
        }
    }
}

function enterModoCliente(client) {
    currentMode    = 'cliente';
    selectedClient = client;

    // Badge
    const badge = document.getElementById('modeBadge');
    const label = document.getElementById('modeBadgeLabel');
    badge.dataset.mode = 'cliente';
    label.textContent  = 'MODO CLIENTE';

    // Sidebar buttons — Modo Cliente: [Modo Lead] + [Modo REP]
    document.getElementById('btnModoGeral').style.display   = 'flex';
    document.getElementById('btnModoLead').style.display    = 'flex';
    document.getElementById('btnModoCliente').style.display = 'none';

    // Context header
    const initials = client.nome.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('contextHeader').innerHTML = `
        <div class="ctx-cliente">
            <div class="ctx-avatar">${initials}</div>
            <div class="ctx-info">
                <div class="ctx-nome">${client.nome}</div>
                <div class="ctx-detalhes">${client.contato} · ${client.endereco}
                    <span class="ctx-status ${client.status}">${client.status === 'vip' ? '⭐ VIP' : '● Ativo'}</span>
                </div>
            </div>
        </div>
    `;

    // Action bar
    renderActionBar([
        { id: 'produtos',  icon: '📦', label: 'Produtos', cmd: `Consultar estoque de produtos para ${client.nome}` },
        { id: 'historico', icon: '📋', label: 'Histórico', cmd: `Histórico de pedidos de ${client.nome}` },
        { id: 'proposta',  icon: '📄', label: 'Proposta',  cmd: `Gerar proposta para ${client.nome}` },
        { id: 'mix',       icon: '🏷️', label: 'Mix',       cmd: `Atualizar mix de categorias para ${client.nome}` },
        { id: 'agendar',   icon: '📅', label: 'Agendar',   cmd: `Agendar visita para ${client.nome}` },
        { id: 'reg-visita',icon: '📝', label: 'Registrar Visita', cmd: `Registrar visita ao cliente ${client.nome}` },
        { id: 'rota',      icon: '🗺️', label: 'Rota',      cmd: `Abrir rota até ${client.nome}` },
        { id: 'reposicao', icon: '🔁', label: 'Reposição', cmd: `Sugestão de reposição para ${client.nome}` },
    ]);

    // Update client list highlight
    renderClientList();

    // Load history for this client
    loadMessageHistory();

}

// ── ACTION BAR ────────────────────────────────────────────────────

function renderActionBar(buttons) {
    const bar = document.getElementById('actionBar');
    bar.innerHTML = '';
    buttons.forEach(btn => {
        const el = document.createElement('button');
        el.className = 'action-btn';
        el.dataset.id = btn.id;
        el.innerHTML = `<span class="action-icon">${btn.icon}</span>${btn.label}`;
        el.addEventListener('click', () => {
            if (window._mobileCloseActionDropdown) window._mobileCloseActionDropdown();
            if (btn.special === 'template') {
                const input = document.getElementById('messageInput');
                input.value = 'Consultar estoque de [produto ou categoria]';
                input.focus();
                const len = input.value.length;
                const start = input.value.indexOf('[');
                const end   = input.value.indexOf(']') + 1;
                setTimeout(() => input.setSelectionRange(start, end), 0);
            } else {
                addMessage('user', btn.cmd);
                setTimeout(() => processCommand(btn.cmd), 600);
            }
        });
        bar.appendChild(el);
    });
}

// ── CLIENT LIST ───────────────────────────────────────────────────

function renderClientList(filter = '') {
    const list = document.getElementById('clientList');
    list.innerHTML = '';
    const counterEl = document.getElementById('clientCounterValue');
    if (counterEl) counterEl.textContent = clientes.length;
    const term = filter.toLowerCase();
    clientes
        .filter(c => !term || c.nome.toLowerCase().includes(term) || c.contato.toLowerCase().includes(term))
        .forEach(client => {
            const el = document.createElement('div');
            el.className = `client-item${selectedClient && selectedClient.id === client.id ? ' active' : ''}`;
            el.innerHTML = `
                <div class="client-item-name">${client.nome}</div>
                <div class="client-item-contact">${client.contato}</div>
                <div class="client-item-address">${client.endereco}</div>
                <span class="client-status ${client.status}">${client.status === 'vip' ? 'VIP' : 'Ativo'}</span>
            `;
            el.addEventListener('click', () => { if (window._mobileCloseSidebar) window._mobileCloseSidebar(); enterModoCliente(client); });
            list.appendChild(el);
        });
}

function setupSearchFilter() {
    document.getElementById('searchInput').addEventListener('input', e => {
        if (currentMode === 'lead') {
            renderLeadList(e.target.value);
        } else {
            renderClientList(e.target.value);
        }
    });
}

// ── EVENT LISTENERS ───────────────────────────────────────────────

function setupEventListeners() {
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('messageInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });
    document.getElementById('voiceBtn').addEventListener('click', toggleVoice);
    document.getElementById('btnModoGeral').addEventListener('click', () => enterModoGeral());
    document.getElementById('btnModoLead').addEventListener('click', () => enterModoLead());
    document.getElementById('btnModoCliente').addEventListener('click', () => enterModoGeral());

    // ── Mobile drawer & dropdown handlers ──
    setupMobileUI();
}

// ── MOBILE UI ────────────────────────────────────────────────────

function setupMobileUI() {
    const hamburger   = document.getElementById('mobileHamburger');
    const dashBtn     = document.getElementById('mobileDashboardBtn');
    const overlay     = document.getElementById('drawerOverlay');
    const sidebar     = document.querySelector('.sidebar');
    const dashboard   = document.querySelector('.dashboard');
    const actionTrig  = document.getElementById('mobileActionsTrigger');
    const actionBar   = document.getElementById('actionBar');

    function openSidebar() {
        sidebar.classList.add('drawer-open');
        overlay.classList.add('open');
    }
    function closeSidebar() {
        sidebar.classList.remove('drawer-open');
        if (!dashboard.classList.contains('drawer-open')) overlay.classList.remove('open');
    }
    function openDashboard() {
        dashboard.classList.add('drawer-open');
        overlay.classList.add('open');
    }
    function closeDashboard() {
        dashboard.classList.remove('drawer-open');
        if (!sidebar.classList.contains('drawer-open')) overlay.classList.remove('open');
    }
    function closeAllDrawers() {
        closeSidebar();
        closeDashboard();
    }
    function toggleActionDropdown() {
        const isOpen = actionBar.classList.contains('dropdown-open');
        actionBar.classList.toggle('dropdown-open', !isOpen);
        actionTrig.classList.toggle('open', !isOpen);
    }

    // ── Output dropdown ──
    const outputToggle   = document.getElementById('mobileOutputToggle');
    const outputDropdown = document.getElementById('mobileOutputDropdown');
    const outputIcon     = document.getElementById('mobileOutputIcon');
    const outputIcons    = { 'texto': '📝', 'texto-voz': '📝🔊', 'voz': '🔊' };

    function closeOutputDropdown() {
        outputDropdown.classList.remove('open');
    }
    function toggleOutputDropdown() {
        const isOpen = outputDropdown.classList.contains('open');
        closeAllDrawers();
        if (window._mobileCloseActionDropdown) window._mobileCloseActionDropdown();
        outputDropdown.classList.toggle('open', !isOpen);
    }

    outputToggle.addEventListener('click', toggleOutputDropdown);
    outputDropdown.querySelectorAll('.mobile-output-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            if (outputIcon) outputIcon.textContent = outputIcons[btn.dataset.mode] || '📝🔊';
            closeOutputDropdown();
        });
    });

    hamburger.addEventListener('click', () => {
        closeOutputDropdown();
        if (sidebar.classList.contains('drawer-open')) { closeSidebar(); } else { closeAllDrawers(); openSidebar(); }
    });
    dashBtn.addEventListener('click', () => {
        closeOutputDropdown();
        if (dashboard.classList.contains('drawer-open')) { closeDashboard(); } else { closeAllDrawers(); openDashboard(); }
    });
    overlay.addEventListener('click', () => { closeAllDrawers(); closeOutputDropdown(); });
    actionTrig.addEventListener('click', () => { closeOutputDropdown(); toggleActionDropdown(); });

    // Expõe closeSidebar para ser chamada ao selecionar cliente/lead
    window._mobileCloseSidebar = closeSidebar;
    window._mobileCloseActionDropdown = () => {
        actionBar.classList.remove('dropdown-open');
        actionTrig.classList.remove('open');
    };
}

// ── MESSAGES ─────────────────────────────────────────────────────

function getHistoryKey() {
    if (currentMode === 'cliente' && selectedClient) return `cliente_${selectedClient.id}`;
    if (currentMode === 'lead' && selectedLead)      return `lead_${selectedLead.id}`;
    return 'geral';
}

function saveMessageToHistory(type, text) {
    const key = getHistoryKey();
    if (!messageHistory[key]) messageHistory[key] = [];
    messageHistory[key].push({ type, text, timestamp: Date.now() });
    localStorage.setItem('commercia_messages_' + key, JSON.stringify(messageHistory[key]));
}

function loadMessageHistory() {
    const key = getHistoryKey();
    const stored = localStorage.getItem('commercia_messages_' + key);
    messageHistory[key] = stored ? JSON.parse(stored) : [];
    const container = document.getElementById('messages');
    container.innerHTML = '';
    messageHistory[key].forEach(msg => {
        const div = document.createElement('div');
        div.className = `message ${msg.type}`;
        div.style.whiteSpace = 'pre-wrap';
        if (msg.text.includes('<a ')) {
            div.innerHTML = msg.text;
        } else {
            div.textContent = msg.text;
        }
        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
}

function addMessage(type, text, noSpeak = false) {
    const container = document.getElementById('messages');

    const shouldSpeak = type === 'assistant' && !noSpeak &&
                        (outputMode === 'texto-voz' || outputMode === 'voz');

    // ① Inicia o fetch do TTS IMEDIATAMENTE — antes de qualquer trabalho de DOM
    let fetchPromise = null;
    let cleanText = null;
    if (shouldSpeak) {
        cleanText = preprocessForSpeech(text);
        if (cleanText) {
            stopAudio();
            ttsActive = true;
            fetchPromise = fetch(
                `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        input: { text: cleanText },
                        voice: { languageCode: 'pt-BR', name: 'pt-BR-Neural2-C', ssmlGender: 'FEMALE' },
                        audioConfig: { audioEncoding: 'MP3', speakingRate: 1.15, pitch: 1.0 }
                    })
                }
            );
        }
    }

    // ② Trabalho de DOM (acontece enquanto a rede processa o TTS)
    saveMessageToHistory(type, text);

    const _now = new Date();
    const _ts  = `${String(_now.getDate()).padStart(2,'0')}/${String(_now.getMonth()+1).padStart(2,'0')} ${String(_now.getHours()).padStart(2,'0')}:${String(_now.getMinutes()).padStart(2,'0')}`;
    const _tsEl = () => { const s = document.createElement('span'); s.className = 'message-time'; s.textContent = _ts; return s; };

    if (type === 'assistant' && outputMode === 'voz') {
        const div = document.createElement('div');
        div.className = 'message assistant voz-only';
        div.innerHTML = `<span class="voz-indicator">🔊</span> <em style="font-size:12px;">Resposta em voz</em>`;
        div.appendChild(_tsEl());
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    } else {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.style.whiteSpace = 'pre-wrap';
        if (text.includes('<a ')) {
            div.innerHTML = text;
        } else {
            div.textContent = text;
        }
        div.appendChild(_tsEl());
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    // ③ Toca assim que o fetch retornar
    if (fetchPromise) {
        fetchPromise
            .then(resp => {
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                return resp.json();
            })
            .then(({ audioContent }) => {
                const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
                currentAudio = audio;
                audio.onended = () => { currentAudio = null; setTimeout(() => { ttsActive = false; }, 300); };
                audio.onerror = () => { currentAudio = null; ttsActive = false; speakFallback(cleanText); };
                audio.play().catch(err => { console.error('play error:', err); ttsActive = false; });
            })
            .catch(err => {
                console.error('Google TTS erro:', err.message);
                ttsActive = false;
                speakFallback(cleanText);
            });
    }
}

function clearMessages() {
    document.getElementById('messages').innerHTML = '';
}

// ── SEND MESSAGE ─────────────────────────────────────────────────

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text  = input.value.trim();
    if (!text) return;
    addMessage('user', text);
    input.value = '';
    setTimeout(() => processCommand(text), 700);
}

// ── COMMAND PROCESSOR ─────────────────────────────────────────────

// ── F10 IMPLEMENTATION — Rota Otimizada com Google Maps ──────────────

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// ── GEOCODING VIA OPENSTREETMAP NOMINATIM ────────────────────────
// Converte endereço + CEP em coordenadas usando OpenStreetMap Nominatim (sem CORS, sem API key)
async function geocodeAddressByGoogle(endereco, bairro, cidade, estado, cep) {
    try {
        const queryVariations = [
            `${endereco}, ${bairro}, ${cidade}, ${estado}, ${cep}, Brasil`,
            `${endereco}, ${cidade}, ${estado}, ${cep}, Brasil`,
            `${endereco}, ${bairro}, ${cidade}, ${estado}, Brasil`,
            `${endereco}, ${cidade}, ${estado}, Brasil`,
            `${cep}, ${cidade}, ${estado}, Brasil`
        ];

        console.log(`[geocodeAddressByGoogle] 🔍 Geocodificando: ${endereco} (${cep})`);

        // Pilot é 100% Porto Alegre — restringe a busca à bounding box da cidade
        // para que o Nominatim nunca retorne um match homônimo de outra cidade.
        // viewbox=<lon1>,<lat1>,<lon2>,<lat2> + bounded=1 (resultado estrito na box)
        const POA_VIEWBOX = '-51.35,-29.90,-51.00,-30.30';

        for (let i = 0; i < queryVariations.length; i++) {
            const query = queryVariations[i];
            const queryUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br&viewbox=${POA_VIEWBOX}&bounded=1`;

            console.log(`  Tentativa ${i + 1}: ${query}`);

            try {
                const response = await fetch(queryUrl);
                if (!response.ok) continue;

                const data = await response.json();

                if (data && data.length > 0) {
                    const location = data[0];
                    const coords = { lat: parseFloat(location.lat), lng: parseFloat(location.lon) };
                    console.log(`[geocodeAddressByGoogle] ✅ ${endereco} → lat:${coords.lat.toFixed(4)}, lng:${coords.lng.toFixed(4)}`);
                    return coords;
                }
            } catch (err) {
                console.warn(`  Tentativa ${i + 1} falhou:`, err.message);
                continue;
            }
        }

        console.warn(`[geocodeAddressByGoogle] ⚠️ Nenhum resultado após ${queryVariations.length} tentativas`);
        return null;
    } catch (error) {
        console.error(`[geocodeAddressByGoogle] ❌ Erro:`, error);
        return null;
    }
}

async function openOptimizedRoute(cliente) {
    addMessage('assistant', '⏳ Calculando rota... aguarde');

    try {
        console.log('\n=== 🗺️ INICIANDO GERAÇÃO DE ROTA ===');
        console.log(`Modo: ${currentMode}`);

        // 1. Geocodificar localização do rep (Petrópolis)
        console.log('\n[STEP 1] Geocodificando ponto de partida (Rep)...');
        const repCoords = await geocodeAddressByGoogle(
            REP_LOCATION.endereco,
            REP_LOCATION.bairro,
            REP_LOCATION.cidade,
            REP_LOCATION.estado,
            REP_LOCATION.cep
        );

        if (!repCoords) {
            console.error('❌ Falha ao geocodificar rep location');
            addMessage('assistant', '❌ Erro ao localizar ponto de partida (Petrópolis). Tente novamente.');
            return;
        }
        console.log(`✅ Rep location geocodificado: lat=${repCoords.lat.toFixed(4)}, lng=${repCoords.lng.toFixed(4)}`);

        // 2. Determinar visitas baseado no modo
        let agendaHoje = [];
        let modeMensagem = '';
        let clientesParaGeocode = [];

        if (currentMode === 'cliente' && cliente) {
            // Modo Cliente: rota apenas para o cliente selecionado
            clientesParaGeocode = [cliente];
            modeMensagem = `Rota para ${cliente.nome}`;
        } else {
            // Modo REP: rota para todos os clientes ativos
            clientesParaGeocode = clientes;
            modeMensagem = 'Rota Otimizada para Hoje';
        }

        console.log(`\n[STEP 2] Clientes a geocodificar: ${clientesParaGeocode.length}`);
        clientesParaGeocode.forEach((c, i) => {
            console.log(`  ${i + 1}. ${c.nome} | CEP: ${c.cep}`);
        });

        // 3. Geocodificar cada cliente
        console.log('\n[STEP 3] Geocodificando cada cliente...');
        const visitasComCoordenadas = [];
        for (const c of clientesParaGeocode) {
            const coords = await geocodeAddressByGoogle(c.endereco, c.bairro, c.cidade, c.estado, c.cep);
            visitasComCoordenadas.push({
                nome: c.nome,
                endereco: c.endereco,
                bairro: c.bairro || '',
                cidade: c.cidade || 'Porto Alegre',
                estado: c.estado || 'RS',
                cep: c.cep,
                lat: coords ? coords.lat : null,
                lng: coords ? coords.lng : null
            });
            if (coords) {
                console.log(`  ✅ ${c.nome}: lat=${coords.lat.toFixed(4)}, lng=${coords.lng.toFixed(4)}`);
            } else {
                console.warn(`  ⚠️ Geocoding falhou para ${c.nome}, incluído via endereço textual`);
            }
        }

        if (visitasComCoordenadas.length === 0) {
            addMessage('assistant', '❌ Nenhum cliente encontrado.');
            return;
        }

        console.log(`\n✅ Total geocodificado: ${visitasComCoordenadas.length}/${clientesParaGeocode.length}`);

        // 4. Calcular distância de cada visita desde Petrópolis
        console.log('\n[STEP 4] Calculando distâncias...');
        const visitasComDistancia = visitasComCoordenadas.map(v => {
            const distancia = (repCoords && v.lat && v.lng)
                ? haversineDistance(repCoords.lat, repCoords.lng, v.lat, v.lng)
                : 999;
            console.log(`  ${v.nome}: ${distancia.toFixed(1)} km`);
            return { ...v, distancia };
        });

        // 5. Ordenar por distância (crescente)
        visitasComDistancia.sort((a, b) => a.distancia - b.distancia);
        console.log('\n[STEP 5] Ordem da rota (por distância):');
        visitasComDistancia.forEach((v, i) => {
            console.log(`  ${i + 1}. ${v.nome} (${v.distancia.toFixed(1)} km)`);
        });

        // 6. Construir mensagem com rota ordenada
        const rotaLinhas = visitasComDistancia.map((v, i) => {
            return `${i + 1}. ${v.nome}\n   📍 ${v.endereco}\n   🔹 CEP: ${v.cep}\n   🔹 Distância: ${v.distancia.toFixed(1)}km`;
        }).join('\n\n');

        addMessage('assistant', `🗺️ ${modeMensagem}\n\n${rotaLinhas}\n\nAbrindo Google Maps com rota...`);

        // 7. Construir URL do Google Maps com ENDEREÇOS TEXTUAIS (Google faz sua própria geocodificação)
        console.log('\n[STEP 6] Construindo Google Maps URL com endereços...');
        const fmtAddr = (end, bairro, cidade, estado, cep) =>
            `${end}${bairro ? ', ' + bairro : ''}, ${cidade} - ${estado}, ${cep}`;

        const repAddress = fmtAddr(REP_LOCATION.endereco, REP_LOCATION.bairro, REP_LOCATION.cidade, REP_LOCATION.estado, REP_LOCATION.cep);
        const destino = visitasComDistancia[visitasComDistancia.length - 1];
        const destAddress = fmtAddr(destino.endereco, destino.bairro, destino.cidade, destino.estado, destino.cep);

        let mapsUrl;
        if (visitasComDistancia.length === 1) {
            mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(repAddress)}&destination=${encodeURIComponent(destAddress)}&travelmode=driving`;
        } else {
            const waypointsStr = visitasComDistancia.slice(0, -1)
                .map(v => encodeURIComponent(fmtAddr(v.endereco, v.bairro, v.cidade, v.estado, v.cep)))
                .join('|');
            mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(repAddress)}&destination=${encodeURIComponent(destAddress)}&waypoints=${waypointsStr}&travelmode=driving`;
        }

        console.log(`  Origin: ${repAddress}`);
        console.log(`  Destination: ${destAddress}`);
        console.log(`  Full URL: ${mapsUrl}`);

        // 8. Abrir Google Maps em nova aba
        console.log('\n✅ Abrindo Google Maps...');
        window.open(mapsUrl, '_blank');
        console.log('=== FIM DA GERAÇÃO DE ROTA ===\n');
    } catch (error) {
        console.error('[openOptimizedRoute] Erro:', error);
        addMessage('assistant', '❌ Erro ao calcular rota. Tente novamente.');
    }
}

// ── NOVO CLIENTE — Step-by-step helpers ──────────────────────────

function askNovoClienteField(stepIndex) {
    const campo = NOVO_CLIENTE_CAMPOS[stepIndex];
    const total = NOVO_CLIENTE_CAMPOS.length;
    const hintLine = campo.hint ? `\n   ${campo.hint}` : '';
    addMessage('assistant', `👤 Cadastro de Novo Cliente\nCampo ${stepIndex + 1} de ${total}\n\n• ${campo.label}:${hintLine}`);
}

function processNovoClienteStep(input) {
    const campo = NOVO_CLIENTE_CAMPOS[novoClienteState.step];
    const val   = input.trim();

    if (campo.key === 'whatsapp') {
        const nums = val.replace(/\D/g, '');
        if (nums.length < 10) {
            addMessage('assistant', `⚠️ Número inválido — informe com DDD (mínimo 10 dígitos).\n   ${campo.hint}`);
            return;
        }
        novoClienteState.dados[campo.key] = nums;

    } else if (campo.key === 'cep') {
        const nums = val.replace(/\D/g, '');
        if (nums.length !== 8) {
            addMessage('assistant', `⚠️ CEP inválido — informe 8 dígitos.\n   Formato: 00000-000. Ex: 90010-150`);
            return;
        }
        novoClienteState.dados[campo.key] = nums.replace(/(\d{5})(\d{3})/, '$1-$2');

    } else if (campo.key === 'observacoes' && val.toLowerCase() === 'pular') {
        novoClienteState.dados[campo.key] = '';

    } else {
        novoClienteState.dados[campo.key] = val;
    }

    novoClienteState.step++;

    if (novoClienteState.step >= NOVO_CLIENTE_CAMPOS.length) {
        const dados = novoClienteState.dados;
        novoClienteState = null;
        saveNovoClienteToSupabase(dados);
    } else {
        askNovoClienteField(novoClienteState.step);
    }
}

async function saveNovoClienteToSupabase(dados) {
    addMessage('assistant', '⏳ Cadastrando cliente...');

    const mixCats = dados.mix
        ? dados.mix.split(/[,;]/).map(c => c.trim()).filter(Boolean)
              .map(c => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase())
        : [];

    const body = {
        nome_loja:          dados.nome_loja,
        nome_comprador:     dados.nome_comprador || null,
        whatsapp_numero:    dados.whatsapp,
        endereco:           dados.endereco,
        cep:                dados.cep,
        segmento:           dados.tipo ? dados.tipo.toLowerCase() : null,
        cidade:             'Porto Alegre',
        estado:             'RS',
        observacoes_perfil: dados.observacoes || null,
        mix_categorias:     mixCats,
    };

    try {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/clientes`, {
            method: 'POST',
            headers: {
                'apikey':        SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type':  'application/json',
                'Prefer':        'return=representation',
            },
            body: JSON.stringify(body),
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const [clienteNovo] = await resp.json();

        // Inserir mix_cliente (junction table) se informado
        if (mixCats.length > 0 && clienteNovo?.id) {
            for (const cat of mixCats) {
                await fetch(`${SUPABASE_URL}/rest/v1/mix_cliente`, {
                    method: 'POST',
                    headers: {
                        'apikey':        SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`,
                        'Content-Type':  'application/json',
                        'Prefer':        'return=minimal',
                    },
                    body: JSON.stringify({ cliente_id: clienteNovo.id, categoria: cat }),
                });
            }
        }

        // Atualizar lista local
        if (clienteNovo) {
            clientes.push({
                id:       clienteNovo.id,
                nome:     clienteNovo.nome_loja,
                contato:  clienteNovo.nome_comprador || 'Sem contato',
                endereco: clienteNovo.endereco,
                bairro:   clienteNovo.bairro || '',
                cidade:   'Porto Alegre',
                estado:   'RS',
                cep:      clienteNovo.cep,
                status:   'active',
            });
            renderClientList();
        }

        const mixInfo = dados.mix       ? `\n• Mix: ${dados.mix}` : '';
        const obsInfo = dados.observacoes ? `\n• Obs: ${dados.observacoes}` : '';
        addMessage('assistant',
            `✅ Cliente cadastrado com sucesso!\n\n📋 Resumo:\n• Nome: ${dados.nome_loja}\n• Contato: ${dados.nome_comprador}\n• WhatsApp: ${dados.whatsapp}\n• Endereço: ${dados.endereco} — CEP: ${dados.cep}\n• Segmento: ${dados.tipo}${mixInfo}${obsInfo}\n\nCliente adicionado à sua carteira.`,
            true);

    } catch (err) {
        console.error('[saveNovoCliente]', err);

        // Fallback local
        clientes.push({
            id:       Date.now(),
            nome:     dados.nome_loja,
            contato:  dados.nome_comprador || 'Sem contato',
            endereco: dados.endereco,
            bairro:   '',
            cidade:   'Porto Alegre',
            estado:   'RS',
            cep:      dados.cep,
            status:   'active',
        });
        renderClientList();

        const mixInfo = dados.mix         ? `\n• Mix: ${dados.mix}` : '';
        const obsInfo = dados.observacoes ? `\n• Obs: ${dados.observacoes}` : '';
        addMessage('assistant',
            `✅ Cliente cadastrado localmente!\n\n📋 Resumo:\n• Nome: ${dados.nome_loja}\n• Contato: ${dados.nome_comprador}\n• WhatsApp: ${dados.whatsapp}\n• Endereço: ${dados.endereco} — CEP: ${dados.cep}\n• Segmento: ${dados.tipo}${mixInfo}${obsInfo}\n\n⚠️ Erro ao salvar no servidor — dados registrados localmente.`);
    }
}

// ─────────────────────────────────────────────────────────────────

function processCommand(cmd) {
    const lc = cmd.toLowerCase().trim();

    // ── Fluxo Confirma/Cancela envio pendente ────────────────────
    if (pendingMsg) {
        if (lc === 'confirma' || lc === 'confirmar' || lc === 'sim' || lc === 'envia' || lc === 'enviar') {
            confirmarEnvioPendente();
            return;
        }
        if (lc === 'cancela' || lc === 'cancelar' || lc === 'não' || lc === 'nao') {
            cancelarEnvioPendente();
            return;
        }
        // Qualquer outra coisa: lembrar que há pendente
        addMessage('assistant', '⚠️ Há uma mensagem aguardando envio.\n\n✅ Diga *"confirma"* para enviar\n❌ Diga *"cancela"* para descartar');
        return;
    }

    // ── Fluxo Agendar Visita ─────────────────────────────────────
    if (agendaState !== null) {
        if (lc === 'cancelar' || lc === 'cancelar agenda' || lc === 'sair' || lc === 'abortar') {
            agendaState = null;
            addMessage('assistant', '❌ Agendamento cancelado.');
            return;
        }
        processAgendaInput(cmd);
        return;
    }

    // ── Fluxo step-by-step: Novo Lead ────────────────────────────
    if (novoLeadState !== null) {
        if (lc === 'cancelar' || lc === 'sair' || lc === 'abortar') {
            novoLeadState = null;
            addMessage('assistant', '❌ Cadastro de lead cancelado.');
            return;
        }
        processNovoLeadStep(cmd);
        return;
    }

    // ── Fluxo step-by-step: Novo Cliente ──────────────────────────
    if (novoClienteState !== null) {
        if (lc === 'cancelar' || lc === 'cancelar cadastro' || lc === 'sair' || lc === 'abortar') {
            novoClienteState = null;
            addMessage('assistant', '❌ Cadastro cancelado.');
            return;
        }
        processNovoClienteStep(cmd);
        return;
    }

    // ── ENGINE DE ENVIO — prioridade sobre handlers de exibição ────
    // "Envie ofertas" → envia via WhatsApp | "Ver ofertas" → exibe no chat
    if (handleEnvioMensagem(cmd, lc)) return;

    // ── Mode switching ─────────────────────────────────────────────
    const modoClienteMatch = lc.match(/modo cliente[^a-z]*selecione?\s+(.+)/);
    if (modoClienteMatch) {
        const nome = modoClienteMatch[1].trim();
        const found = clientes.find(c => c.nome.toLowerCase().includes(nome));
        if (found) { enterModoCliente(found); return; }
        addMessage('assistant', `⚠️ Cliente "${nome}" não encontrado na carteira. Clientes disponíveis:\n${clientes.map(c => '• ' + c.nome).join('\n')}`);
        return;
    }
    if (lc.includes('modo rep') || lc.includes('modo rep,') || lc.includes('modo geral') || lc.includes('modo geral,')) {
        enterModoGeral();
        return;
    }

    // ── F15 — Ofertas do Dia (Todas as Categorias - Modo REP) ──────
    // PRIORIDADE ALTA: Verificar antes de F1/F2 para não capturar "produto" genérico
    if (lc.includes('oferta') || lc.includes('ave') || lc.includes('promoção')) {
        const ofertas = [
            { nome: 'Frango Inteiro 1kg',    estoque: 240, preco_un: 12.90, desconto: 15, categoria: '🐔 Aves' },
            { nome: 'Coxa e Sobrecoxa 1kg',  estoque: 180, preco_un: 10.50, desconto: 15, categoria: '🐔 Aves' },
            { nome: 'Costela Suína 1kg',     estoque: 88,  preco_un: 22.00, desconto: 12, categoria: '🐖 Suínos' },
            { nome: 'Linguiça Toscana 1kg',  estoque: 67,  preco_un: 19.90, desconto: 10, categoria: '🐖 Suínos' },
            { nome: 'Filé Bovino 500g',      estoque: 150, preco_un: 45.00, desconto: 8,  categoria: '🐄 Bovinos' },
            { nome: 'Queijo Mussarela 500g', estoque: 120, preco_un: 28.00, desconto: 12, categoria: '🧀 Queijos' },
            { nome: 'Queijo Parmesão Ralado 200g', estoque: 95, preco_un: 18.50, desconto: 10, categoria: '🧀 Queijos' },
            { nome: 'Mortadela 500g',        estoque: 200, preco_un: 12.00, desconto: 15, categoria: '🥓 Embutidos' },
            { nome: 'Salmão Fresco 400g',    estoque: 60,  preco_un: 55.00, desconto: 8,  categoria: '🐟 Pescados' },
        ];
        // Agrupar por categoria
        const grupos = {};
        ofertas.forEach(o => {
            if (!grupos[o.categoria]) grupos[o.categoria] = [];
            grupos[o.categoria].push(o);
        });
        const linhas = Object.entries(grupos).map(([cat, prods]) => {
            const prodLinhas = prods.map(o => {
                const precoComDesc = (o.preco_un * (1 - o.desconto / 100)).toFixed(2);
                return `  • ${o.nome}\n    💰 De R$ ${o.preco_un.toFixed(2)} por R$ ${precoComDesc} (-${o.desconto}%)\n    📦 Estoque: ${o.estoque} unidades`;
            }).join('\n');
            return `${cat}\n${prodLinhas}`;
        }).join('\n\n');
        addMessage('assistant', `🏷️ Ofertas do Dia\n\n${linhas}\n\nDeseja registrar um pedido com algum desses produtos?`);
        return;
    }

    // ── F1 / F2 — Consulta de Produtos/Preços (Ambos os Modos) ────
    if (lc.includes('consultar estoque') || lc.includes('estoque de') || lc.includes('tem ') && lc.includes('disponív') ||
        lc.includes('produto') || lc.includes('produtos')) {
        responderConsultaProdutos(lc);
        return;
    }
    if (lc.includes('tabela de preço') || lc.includes('preço de') || lc.includes('quanto custa') || lc.includes('ver preços')) {
        responderTabelaPrecos(lc);
        return;
    }

    // ── F12 — Informações Técnicas (Ambos os Modos) ────────────────
    if (lc.includes('informação técnica') || lc.includes('composição') || lc.includes('ficha técnica') || lc.includes('especificação')) {
        addMessage('assistant', '📋 Informações Técnicas — Frango Inteiro 1kg\n\n• Peso líquido: 1kg (±50g)\n• Validade: 5 dias refrigerado / 6 meses congelado\n• Temperatura de armazenagem: -18°C\n• Certificações: SIF, MAPA, Halal\n• Fornecedor: conforme cadastro do sistema\n\nDigite o nome do produto para consultar outro.');
        return;
    }

    // ── F3 — Histórico de Pedidos (Modo Cliente) ───────────────────
    if (lc.includes('histórico') || lc.includes('pedidos anteriores') || lc.includes('últimos pedidos')) {
        if (currentMode !== 'cliente') { addMessage('assistant', '⚠️ Selecione um cliente para ver o histórico de pedidos.'); return; }
        const hist = mockHistorico[selectedClient.id] || [];
        if (!hist.length) { addMessage('assistant', `Nenhum pedido encontrado para ${selectedClient.nome}.`); return; }
        const linhas = hist.map(h => `📦 ${h.data} · Pedido ${h.pedido} · ${h.valor}\n   ${h.itens}`).join('\n\n');
        addMessage('assistant', `📋 Histórico de Pedidos — ${selectedClient.nome}\n\n${linhas}`);
        return;
    }

    // ── F4 — Registro de Pedido por Voz (Modo Cliente) ─────────────
    if (lc.includes('registrar pedido') || lc.includes('criar pedido') || (lc.includes('pedido') && (lc.includes('cx') || lc.includes('caixa')))) {
        if (currentMode !== 'cliente') { addMessage('assistant', '⚠️ Selecione um cliente para registrar um pedido.'); return; }
        if (!repData?.id) { addMessage('assistant', '⚠️ Rep não carregado. Recarregue a página e tente novamente.'); return; }
        savePedidoToSupabase(selectedClient.id, repData.id)
            .then(row => {
                const shortId = row.id.slice(0, 8).toUpperCase();
                addMessage('assistant', `✅ Pré-pedido #${shortId} salvo!\n\nCliente: ${selectedClient.nome}\nStatus: Pré-pedido\nData: ${new Date().toLocaleDateString('pt-BR')}\n\n📌 Itens não vinculados nesta versão — confirme com o cliente antes de enviar.`);
            })
            .catch(err => {
                console.error('[F4]', err);
                addMessage('assistant', `⚠️ Falha ao salvar pedido. Verifique a conexão e tente novamente.`);
            });
        return;
    }

    // ── F5 — Proposta Comercial (Modo Cliente) ─────────────────────
    if (lc.includes('proposta') || lc.includes('gerar proposta')) {
        if (currentMode !== 'cliente') { addMessage('assistant', '⚠️ Selecione um cliente para gerar uma proposta.'); return; }
        addMessage('assistant', `📄 Proposta Comercial gerada — ${selectedClient.nome}\n\nPROPOSTA Nº 2026-051\nData: ${new Date().toLocaleDateString('pt-BR')}\nCliente: ${selectedClient.nome}\nContato: ${selectedClient.contato}\n\nItens sugeridos com base no perfil de compra:\n• Frango Inteiro 50cx — R$ 7.740,00\n• Queijo Mussarela 20cx — R$ 3.840,00\n\nTotal: R$ 11.580,00\nCondição: 30 dias · Entrega em até 48h`, true);
        return;
    }

    // ── F6 — Atualizar Mix de Categorias (Modo Cliente) ─────────
    if (lc.includes('cadastre') && lc.includes('categoria')) {
        if (currentMode !== 'cliente') { addMessage('assistant', '⚠️ Selecione um cliente para cadastrar categorias.'); return; }

        const categoriasPossiveis = ['Aves', 'Bovinos', 'Queijos', 'Embutidos', 'Pescados', 'Frios'];
        const categoriasEncontradas = categoriasPossiveis.filter(cat => lc.includes(cat.toLowerCase()));

        if (categoriasEncontradas.length === 0) {
            addMessage('assistant', '⚠️ Nenhuma categoria válida encontrada. Use:\n"Cadastre a categoria [cat1] e [cat2]"\n\nCategorias disponíveis: Aves, Bovinos, Queijos, Embutidos, Pescados, Frios');
            return;
        }

        const cId = selectedClient.id;
        const nomeCliente = selectedClient.nome;
        fetchMixClienteFromSupabase(cId)
            .then(mixAtual => {
                const novas = categoriasEncontradas.filter(c => !mixAtual.includes(c));
                if (novas.length === 0) {
                    addMessage('assistant', `ℹ️ Categorias já cadastradas para ${nomeCliente}:\n\n${mixAtual.map(c => '• ' + c).join('\n')}\n\nNenhuma categoria nova foi adicionada.`);
                    return;
                }
                return addMixCategoriasToSupabase(cId, novas)
                    .then(() => fetchMixClienteFromSupabase(cId))
                    .then(mixFinal => {
                        addMessage('assistant', `✅ Categorias cadastradas com sucesso!\n\n🏷️ Mix de Categorias — ${nomeCliente}\n\nCategorias cadastradas:\n${mixFinal.map(c => '• ' + c).join('\n')}\n\nO cliente agora está configurado para receber ofertas destas categorias.`, true);
                    });
            })
            .catch(err => {
                console.error('[F6 cadastre]', err);
                addMessage('assistant', '⚠️ Falha ao cadastrar categorias. Verifique a conexão e tente novamente.');
            });
        return;
    }

    if (lc.includes('mix') || (lc.includes('categoria') && lc.includes('atualizar'))) {
        if (currentMode !== 'cliente') { addMessage('assistant', '⚠️ Selecione um cliente para ver o mix de categorias.'); return; }
        const nomeCliente = selectedClient.nome;
        fetchMixClienteFromSupabase(selectedClient.id)
            .then(mix => {
                const lista = mix.length ? mix.map(c => '• ' + c).join('\n') : '(nenhuma categoria cadastrada)';
                addMessage('assistant', `🏷️ Mix de Categorias — ${nomeCliente}\n\nCategorias cadastradas:\n${lista}\n\nComando para adicionar: "Cadastre a categoria [cat1] e [cat2]"\n\nCategorias disponíveis: Aves, Bovinos, Queijos, Embutidos, Pescados, Frios`);
            })
            .catch(err => {
                console.error('[F6 consulta]', err);
                addMessage('assistant', '⚠️ Falha ao carregar mix de categorias. Verifique a conexão.');
            });
        return;
    }

    // ── F7 — Sugestão de Reposição (Modo Cliente) ──────────────────
    if (lc.includes('reposição') || lc.includes('repor') || lc.includes('sugestão de reposição')) {
        if (currentMode !== 'cliente') { addMessage('assistant', '⚠️ Selecione um cliente para sugestão de reposição.'); return; }
        addMessage('assistant', `🔁 Sugestão de Reposição — ${selectedClient.nome}\n\nCom base no histórico de compras:\n\n• Frango Inteiro · última compra há 3 dias · frequência: quinzenal → ✅ aguardar\n• Queijo Mussarela · última compra há 10 dias · frequência: semanal → ⚠️ repor\n• Filé de Frango · última compra há 21 dias → 🔴 urgente\n\nDeseja registrar um pedido de reposição?`);
        return;
    }

    // ── F8 — Análise de Perfil de Compra (Modo Cliente) ────────────
    if (lc.includes('análise') || lc.includes('perfil de compra') || lc.includes('análise de perfil')) {
        if (currentMode !== 'cliente') { addMessage('assistant', '⚠️ Selecione um cliente para análise de perfil.'); return; }
        addMessage('assistant', `📊 Análise de Perfil — ${selectedClient.nome}\n\nCategorias mais consumidas:\n1. Aves — 48% do volume\n2. Queijos — 28% do volume\n3. Embutidos — 14% do volume\n\nTicket médio: R$ 4.200\nFrequência: pedidos a cada 8 dias\n\nOportunidades identificadas:\n• Pescados — nunca comprou → propor apresentação\n• Bovinos — abaixo da média da categoria`);
        return;
    }

    // ── MODO LEAD — Comandos específicos ──────────────────────────

    if (currentMode === 'lead') {

        // Novo Lead
        if (lc.includes('cadastrar novo lead') || lc.includes('novo lead')) {
            novoLeadState = { step: 0, dados: {} };
            askNovoLeadField(0);
            return;
        }

        // Registrar Visita (lead)
        if (lc.includes('registrar visita lead') || (lc.includes('registrar visita') && currentMode === 'lead')) {
            if (!selectedLead) {
                addMessage('assistant', '⚠️ Selecione um lead na lista para registrar a visita.');
                return;
            }
            const agora = new Date();
            const data  = agora.toLocaleDateString('pt-BR');
            const hora  = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            addMessage('assistant',
                `📝 Visita ao Lead registrada!\n\nLead: ${selectedLead.nome}\nData: ${data}\nHorário: ${hora}\nEndereço: ${selectedLead.endereco || '—'}\n\nVisita registrada. Deseja agendar próximo retorno ou incluir como cliente?`,
                true);
            return;
        }

        // Incluir Cliente
        if ((lc.includes('incluir') && lc.includes('como cliente')) || lc.includes('incluir cliente')) {
            if (!selectedLead) {
                addMessage('assistant', '⚠️ Selecione um lead na lista para incluir como cliente.');
                return;
            }
            convertLeadToCliente(selectedLead);
            return;
        }

        // Agendar (lead) — só GCal, sem FK para agenda_visitas
        if (lc.includes('agendar visita lead') || lc.includes('agendar visita')) {
            if (!selectedLead) {
                addMessage('assistant', '⚠️ Selecione um lead na lista para agendar uma visita.');
                return;
            }
            agendaState = { cliente: selectedLead, waitingDateTime: true, isLead: true };
            addMessage('assistant',
                `📅 Agendar Visita — ${selectedLead.nome}\n\n📍 Local: ${selectedLead.endereco || selectedLead.cidade}\n👤 Contato: ${selectedLead.contato}\n\nInforme a data e a hora da visita`);
            return;
        }

        // Rota (lead)
        if (lc.includes('abrir rota') || lc.includes('rota')) {
            if (!selectedLead) {
                addMessage('assistant', '⚠️ Selecione um lead na lista para calcular a rota.');
                return;
            }
            const addr = [selectedLead.endereco, selectedLead.bairro, selectedLead.cidade, 'RS'].filter(Boolean).join(', ');
            const url  = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
            addMessage('assistant',
                `🗺️ Rota para ${selectedLead.nome}\n\n📍 ${addr}\n\n🔗 <a href="${url}" target="_blank" rel="noopener" style="color:var(--teal);text-decoration:underline;">Abrir no Google Maps</a>`,
                true);
            return;
        }
    }

    // ── F9 — Agendamento de Visita (Modo Cliente) ──────────────────
    if ((lc.includes('agendar') || lc.includes('agendamento') || lc.includes('marcar visita')) && currentMode === 'cliente') {
        agendaState = { cliente: selectedClient, waitingDateTime: true };
        addMessage('assistant', `📅 Agendar Visita — ${selectedClient.nome}\n\n📍 Local: ${selectedClient.endereco}\n👤 Contato: ${selectedClient.contato}\n\nInforme a data e a hora da visita`);
        return;
    }

    // ── F11 — Agenda do Rep (Modo Geral) ───────────────────────────
    if (lc.includes('agenda') || lc.includes('visitas de hoje') || lc.includes('compromissos')) {
        addMessage('assistant', `📅 Agenda de Hoje — ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}\n\n08:30 · Restaurante Sabor do Sul\n10:00 · Churrascaria Gaúcha\n13:30 · Pizzaria Don Carlo\n15:30 · Buffet Sabores\n\n4 visitas · ~6h estimadas`);
        return;
    }

    // ── F13 — Cadastro de Novo Cliente (Modo REP) ────────────────
    if (lc.includes('cadastrar novo') || lc.includes('novo cliente') || lc.includes('adicionar cliente')) {
        novoClienteState = { step: 0, dados: {} };
        askNovoClienteField(0);
        return;
    }

    // ── F14 — Registro de Visita (Modo Cliente) ─────────────────────
    if (lc.includes('registrar visita') || lc.includes('visita realizada') || lc.includes('anotação de visita')) {
        if (currentMode !== 'cliente') { addMessage('assistant', '⚠️ Selecione um cliente para registrar uma visita.'); return; }
        const agora = new Date();
        const data = agora.toLocaleDateString('pt-BR');
        const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        addMessage('assistant', `📝 Visita registrada com sucesso!\n\nCliente: ${selectedClient.nome}\nData: ${data}\nHorário: ${hora}\nEndereço: ${selectedClient.endereco}\n\nVisita cadastrada no sistema. Deseja criar um pedido ou agendar o próximo retorno?`, true);
        return;
    }

    // ── Rotas — Visitas Otimizadas (Modo REP) ──────────────────
    if (lc.includes('rota') || lc.includes('rotas') || lc.includes('listar rotas')) {
        if (currentMode === 'geral') {
            openOptimizedRoute(null);
        } else {
            openOptimizedRoute(selectedClient);
        }
        return;
    }

    // ── F16 — Inbound WhatsApp (Modo REP) ────────────────────────
    if (lc.includes('mensagem recebida') || lc.includes('inbound') || lc.includes('responder whatsapp')) {
        addMessage('assistant', `📲 F16 — WhatsApp Inbound\n\nO webhook de recebimento está ativo no backend. Mensagens enviadas pelos clientes ao número do rep são processadas automaticamente.\n\nA visualização das mensagens recebidas dentro do app está em desenvolvimento e será disponibilizada em breve.`);
        return;
    }

    // ── Prospecção — Linguagem Natural (Modo REP) ────────────────
    if (lc.includes('busque') || lc.includes('buscar') || lc.includes('encontre') || lc.includes('encontrar') ||
        lc.includes('prospectar') || lc.includes('leads') || lc.includes('estabelecimento') ||
        (lc.includes('restaurante') && !lc.includes('histórico')) ||
        (lc.includes('bairro') && (lc.includes('busque') || lc.includes('buscar') || lc.includes('encontre')))) {
        responderProspeccao(cmd);
        return;
    }

    // ── Fallback: nenhuma resposta para comandos não reconhecidos ──
}

// ── HELPERS ──────────────────────────────────────────────────────

function formatarPrecosProduto(p) {
    const itens = [];
    if (p.preco_cx  != null) itens.push(`R$ ${parseFloat(p.preco_cx).toFixed(2)}/cx`);
    if (p.preco_kg  != null) itens.push(`R$ ${parseFloat(p.preco_kg).toFixed(2)}/kg`);
    if (p.preco_pct != null) itens.push(`R$ ${parseFloat(p.preco_pct).toFixed(2)}/pct`);
    if (p.preco_un  != null) itens.push(`R$ ${parseFloat(p.preco_un).toFixed(2)}/un`);
    if (p.preco_fd  != null) itens.push(`R$ ${parseFloat(p.preco_fd).toFixed(2)}/fd`);
    return itens.length ? itens.join(' · ') : 'Preço sob consulta';
}

function badgeEstoque(status) {
    if (status === 'disponivel') return '✅';
    if (status === 'consultar')  return '⚠️';
    return '🔴';
}

function responderConsultaProdutos(lc) {
    if (!produtos.length) {
        addMessage('assistant', '⏳ Produtos ainda carregando. Aguarde um instante e tente novamente.');
        return;
    }

    const termo = lc
        .replace(/consultar estoque de?|estoque de?|buscar?|ver |mostrar |tem /g, '')
        .replace(/\[produto ou categoria\]/g, '')
        .trim();

    const GENERICOS = ['produtos', 'estoque', 'todos', 'tudo', 'geral', ''];
    const resultados = (!termo || GENERICOS.includes(termo))
        ? produtos.slice(0, 5)
        : produtos.filter(p =>
            p.nome.toLowerCase().includes(termo) ||
            (p.categoria || '').toLowerCase().includes(termo)
          );

    if (!resultados.length) {
        const cats = [...new Set(produtos.map(p => (p.categoria || '').toLowerCase()))].filter(Boolean).slice(0, 8).join(', ');
        addMessage('assistant', `📦 Nenhum produto encontrado para "${termo}".\n\nCategorias disponíveis: ${cats}.`);
        return;
    }

    const linhas = resultados.map(p => {
        const badge  = badgeEstoque(p.estoque_status);
        const precos = formatarPrecosProduto(p);
        return `${badge} ${p.nome}\n   ${precos}`;
    }).join('\n\n');

    const contexto = currentMode === 'cliente' ? ` — ${selectedClient.nome}` : '';
    addMessage('assistant', `📦 Consulta de Estoque${contexto}\n\n${linhas}\n\n${resultados.length} produto(s) encontrado(s). Total no catálogo: ${produtos.length}.`);
}

function responderTabelaPrecos(lc) {
    if (!produtos.length) {
        addMessage('assistant', '⏳ Produtos ainda carregando. Aguarde um instante e tente novamente.');
        return;
    }
    const contexto = currentMode === 'cliente' ? `\nCliente: ${selectedClient.nome} (preços padrão)` : '';
    const amostra = produtos.slice(0, 8);
    const linhas = amostra.map(p => `• ${p.nome}\n  ${formatarPrecosProduto(p)}`).join('\n\n');
    addMessage('assistant', `💰 Tabela de Preços${contexto}\n\n${linhas}\n\n(Exibindo ${amostra.length} de ${produtos.length} produtos. Especifique a categoria para filtrar.)`);
}

async function responderProspeccao(cmd) {
    const lc = cmd.toLowerCase();

    // Extrai quantidade solicitada
    const numMatch = lc.match(/\b(\d+)\s+(estabelecimento|restaurante|lead|cliente|churrascaria|lanchonete|buffet)/);
    const qtd = numMatch ? Math.min(parseInt(numMatch[1]), 10) : 5;

    // Monta query: remove wake word e frase "que não são meus clientes"
    let searchQuery = cmd
        .replace(/commercia[!,]?\s*/i, '')
        .replace(/busque?\s+|encontre?\s+|me mostre?\s+/i, '')
        .replace(/que não (sejam?|estejam?|est[aá]) (na minha carteira|meus clientes|cliente meu)/gi, '')
        .replace(/e que não (sejam?|estejam?|est[aá]) (na minha carteira|meus clientes|cliente meu)/gi, '')
        .replace(/\s+/g, ' ').trim();

    // Acrescenta cidade se não mencionada
    if (!lc.includes('porto alegre') && !lc.includes(' poa') && !lc.includes('rs')) {
        searchQuery += `, ${CIDADE_PILOTO}`;
    }

    addMessage('assistant', `🔍 Buscando no Google Maps: "${searchQuery}"...`);

    try {
        const data = await buscarPlaces(searchQuery, qtd + 4);

        if (!data.places || !data.places.length) {
            addMessage('assistant', `🔍 Nenhum estabelecimento encontrado para "${searchQuery}".\nTente especificar o bairro ou tipo de negócio.`);
            return;
        }

        // Filtra quem já está na carteira
        const carteiraNomes = clientes.map(c => c.nome.toLowerCase());
        const leads = data.places.filter(p => {
            const nome = (p.displayName?.text || '').toLowerCase();
            return !carteiraNomes.some(n => nome.includes(n) || n.includes(nome));
        }).slice(0, qtd);

        if (!leads.length) {
            addMessage('assistant', `🔍 Todos os resultados já estão na sua carteira de clientes.`);
            return;
        }

        const linhas = leads.map((p, i) => {
            const nome = p.displayName?.text || 'Nome não disponível';
            const end  = p.formattedAddress || 'Endereço não disponível';
            const tel  = p.internationalPhoneNumber || '—';
            return `${i + 1}. ${nome}\n   📍 ${end}\n   📞 ${tel}`;
        }).join('\n\n');

        addMessage('assistant', `🎯 ${leads.length} lead(s) encontrado(s) — Google Maps (dados reais):\n\n${linhas}\n\nDeseja cadastrar algum destes clientes?`);

    } catch (err) {
        console.warn('Places API falhou, usando dados de demonstração:', err.message);
        responderProspeccaoDemo(lc, qtd);
    }
}

async function buscarPlaces(query, maxResults = 5) {
    const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
            'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.types,places.location'
        },
        body: JSON.stringify({ textQuery: query, maxResultCount: maxResults, languageCode: 'pt-BR' })
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
}

function responderProspeccaoDemo(lc, qtd) {
    // Fallback com dados simulados — usado apenas se a API falhar
    const mockLeads = [
        { nome: 'Churrascaria Pampa Gaúcho',  end: 'Rua Ramiro Barcelos, 389 — Higienópolis',  tel: '(51) 3333-1042' },
        { nome: 'Restaurante Famiglia Rossi', end: 'Av. Osvaldo Aranha, 1250 — Higienópolis',  tel: '(51) 3333-1001' },
        { nome: 'Espetinho do Zé',            end: 'Rua Cel. Fernando Machado, 80 — Centro',    tel: '(51) 3333-1099' },
        { nome: 'Steakhouse Vila Nova',       end: 'Rua Moinhos de Vento, 920',                  tel: '(51) 3333-2345' },
        { nome: 'Bar e Petiscaria O Gaúcho',  end: 'Av. Goethe, 97 — Moinhos de Vento',         tel: '(51) 3333-2210' },
    ];
    const carteiraNomes = clientes.map(c => c.nome.toLowerCase());
    const leads = mockLeads.filter(l => !carteiraNomes.some(n => l.nome.toLowerCase().includes(n))).slice(0, qtd);
    const linhas = leads.map((l, i) => `${i + 1}. ${l.nome}\n   📍 ${l.end}\n   📞 ${l.tel}`).join('\n\n');
    addMessage('assistant', `🎯 ${leads.length} lead(s) — dados de demonstração (API indisponível):\n\n${linhas}\n\nDeseja cadastrar algum destes clientes?`);
}

// ══════════════════════════════════════════════════════════════════
// ENGINE DE ENVIO DE MENSAGENS — WhatsApp via Evolution API
// Fluxo: Rep pede → Commercia monta preview → Rep confirma → Envia
// Sem abrir abas, tudo via API backend
// ══════════════════════════════════════════════════════════════════

let pendingMsg = null; // { tipo, destinos: [{nome, whatsapp}], texto, contexto }

// ── Envio via API ────────────────────────────────────────────────
async function enviarViaAPI(numero, mensagem) {
    const repWhatsapp = repData?.telefone || '51981114289';

    if (!BACKEND_URL) {
        // Sem backend: simula envio para demo
        console.log(`[SIMUL] Enviando para ${numero}: ${mensagem.substring(0, 60)}...`);
        await new Promise(r => setTimeout(r, 800));
        return { success: true, simulado: true };
    }

    try {
        const resp = await fetch(`${BACKEND_URL}/api/whatsapp/enviar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero, mensagem, rep_whatsapp: repWhatsapp })
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return await resp.json();
    } catch (e) {
        console.error('[enviarViaAPI]', e);
        return { success: false, error: e.message };
    }
}

// ── Resolução de destinatários ───────────────────────────────────
function resolverDestinatarios(lc) {
    // Modo Cliente: enviar para o cliente selecionado
    if (currentMode === 'cliente' && selectedClient) {
        return [{ nome: selectedClient.nome, whatsapp: selectedClient.whatsapp, contato: selectedClient.contato }];
    }

    // Modo REP/Geral: detectar nomes de clientes mencionados
    const mencionados = [];
    clientes.forEach(c => {
        const nomeLC = c.nome.toLowerCase();
        // Match parcial: "lanchonete" → "Lanchonete Express"
        const palavras = nomeLC.split(/\s+/);
        if (palavras.some(p => p.length > 3 && lc.includes(p)) || lc.includes(nomeLC)) {
            mencionados.push({ nome: c.nome, whatsapp: c.whatsapp, contato: c.contato });
        }
    });

    // "todos os clientes" / "para todos" / "para a carteira"
    if (lc.includes('todos os clientes') || lc.includes('para todos') || lc.includes('toda a carteira') || lc.includes('carteira toda')) {
        return clientes.filter(c => c.whatsapp).map(c => ({
            nome: c.nome, whatsapp: c.whatsapp, contato: c.contato
        }));
    }

    return mencionados;
}

// ── Templates de mensagem por tipo ───────────────────────────────
function gerarMensagem(tipo, contexto = {}) {
    const repNome = repData?.nome || 'Carlos Rep.';
    const data = new Date().toLocaleDateString('pt-BR');
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    switch (tipo) {
        case 'ofertas':
            return `🏷️ *Ofertas do Dia*\n📅 ${data}\n\n` +
                `1. Frango Inteiro 1kg — R$ 10,97/un (-15%)\n` +
                `2. Coxa e Sobrecoxa 1kg — R$ 8,93/un (-15%)\n` +
                `3. Costela Suína 1kg — R$ 19,36/un (-12%)\n` +
                `4. Linguiça Toscana 1kg — R$ 17,91/un (-10%)\n\n` +
                `📦 Estoque limitado. Pedidos até 17h para entrega amanhã.\n` +
                `Responda com o número do item + quantidade.\n\n` +
                `${repNome}`;

        case 'proposta':
            return `📄 *Proposta Comercial*\n📅 ${data}\n\n` +
                `Cliente: ${contexto.clienteNome || ''}\n\n` +
                `• Frango Inteiro 50cx — R$ 7.740,00\n` +
                `• Queijo Mussarela 20cx — R$ 3.840,00\n\n` +
                `💰 Total: R$ 11.580,00\n` +
                `📋 Condição: 30 dias · Entrega em até 48h\n\n` +
                `Confirme este pedido respondendo *SIM* ou solicite ajustes.\n\n` +
                `${repNome}`;

        case 'confirmacao_pedido':
            return `✅ *Confirmação de Pedido*\n📅 ${data} às ${hora}\n\n` +
                `Cliente: ${contexto.clienteNome || ''}\n` +
                `Pedido: #${contexto.pedidoNum || '2026-052'}\n\n` +
                `Itens conforme solicitado.\n` +
                `Status: Aprovado ✅\n` +
                `Previsão de entrega: até 48h\n\n` +
                `Dúvidas? Responda esta mensagem.\n\n` +
                `${repNome}`;

        case 'confirmacao_visita':
            return `📅 *Agendamento de Visita*\n\n` +
                `Olá! Confirmo visita agendada:\n\n` +
                `📅 Data: ${contexto.dataVisita || 'a definir'}\n` +
                `🕐 Horário: ${contexto.horaVisita || 'a definir'}\n\n` +
                `Posso confirmar? Responda *SIM* ou sugira outro horário.\n\n` +
                `${repNome}`;

        case 'reposicao':
            return `🔁 *Sugestão de Reposição*\n📅 ${data}\n\n` +
                `${contexto.clienteNome || ''}, com base no seu histórico:\n\n` +
                `⚠️ Queijo Mussarela — último pedido há 10 dias (frequência: semanal)\n` +
                `🔴 Filé de Frango — último pedido há 21 dias\n\n` +
                `Quer que eu prepare um pedido de reposição?\n` +
                `Responda *SIM* para confirmar ou informe os itens desejados.\n\n` +
                `${repNome}`;

        case 'tabela_precos':
            return `📋 *Tabela de Preços*\n📅 ${data}\n\n` +
                `• Frango Inteiro 1kg — R$ 12,90/un · R$ 154,80/cx\n` +
                `• Coxa Sobrecoxa 1kg — R$ 10,50/un · R$ 126,00/cx\n` +
                `• Filé de Frango 500g — R$ 16,90/un · R$ 202,80/cx\n` +
                `• Queijo Mussarela 500g — R$ 28,00/un · R$ 168,00/cx\n` +
                `• Costela Suína 1kg — R$ 22,00/un · R$ 264,00/cx\n\n` +
                `Condição: 30 dias · Pedido mínimo: 5 caixas\n\n` +
                `${repNome}`;

        case 'followup':
            return `Olá! Aqui é ${repNome} 👋\n\n` +
                `Passando para verificar se há necessidade de reposição ou novidades em que eu possa ajudar.\n\n` +
                `Estou à disposição!`;

        case 'personalizado':
            return contexto.textoLivre || '';

        default:
            return `Mensagem enviada por ${repNome}.`;
    }
}

// ── Detecção de intenção de envio ────────────────────────────────
function detectarIntencaoEnvio(lc) {
    // Padrões: "envie...", "mande...", "compartilhe...", "encaminhe..."
    const verbosEnvio = /^(envie|envia|mande|manda|compartilhe|encaminhe|enviar|mandar|compartilhar|encaminhar|envi[ea]r?)\b/;
    const temVerboEnvio = verbosEnvio.test(lc) || lc.includes('envie ') || lc.includes('mande ') || lc.includes('compartilhe ');

    // "peça confirmação" / "confirme com o cliente"
    const temPedirConfirmacao = lc.includes('peça confirmação') || lc.includes('confirme com') || lc.includes('pedir confirmação');

    if (!temVerboEnvio && !temPedirConfirmacao) return null;

    // Detectar tipo de mensagem
    if (lc.includes('oferta') || lc.includes('promoç')) return 'ofertas';
    if (lc.includes('proposta')) return 'proposta';
    if (lc.includes('pedido') || lc.includes('confirmação do pedido') || lc.includes('confirme o pedido')) return 'confirmacao_pedido';
    if (lc.includes('agenda') || lc.includes('visita') || temPedirConfirmacao) return 'confirmacao_visita';
    if (lc.includes('reposição') || lc.includes('repor')) return 'reposicao';
    if (lc.includes('tabela') || lc.includes('preço') || lc.includes('preços')) return 'tabela_precos';
    if (lc.includes('followup') || lc.includes('follow up') || lc.includes('acompanhar')) return 'followup';

    // Se tem verbo de envio mas não identificou tipo → personalizado
    return 'personalizado';
}

// ── Handler principal de envio ───────────────────────────────────
function handleEnvioMensagem(cmd, lc) {
    const tipo = detectarIntencaoEnvio(lc);
    if (!tipo) return false; // Não é intenção de envio

    const destinos = resolverDestinatarios(lc);

    // Sem destinatários identificados
    if (destinos.length === 0) {
        if (currentMode === 'geral') {
            addMessage('assistant', '⚠️ Não identifiquei o destinatário. Diga o nome do cliente ou use "para todos os clientes".\n\nExemplo: "Envie as ofertas para Lanchonete Express" ou "Envie ofertas para todos os clientes".');
        } else if (currentMode === 'cliente' && selectedClient && !selectedClient.whatsapp) {
            addMessage('assistant', `⚠️ ${selectedClient.nome} não possui WhatsApp cadastrado. Atualize o cadastro antes de enviar.`);
        } else {
            addMessage('assistant', '⚠️ Selecione um cliente ou informe o nome para enviar a mensagem.');
        }
        return true;
    }

    // Sem WhatsApp nos destinatários
    const semWhatsapp = destinos.filter(d => !d.whatsapp);
    if (semWhatsapp.length > 0 && semWhatsapp.length === destinos.length) {
        addMessage('assistant', `⚠️ Nenhum dos destinatários possui WhatsApp cadastrado:\n${semWhatsapp.map(d => '• ' + d.nome).join('\n')}`);
        return true;
    }

    // Gerar contexto
    const contexto = {
        clienteNome: destinos.length === 1 ? destinos[0].nome : '',
    };

    // Mensagem personalizada: extrair texto livre
    if (tipo === 'personalizado') {
        const textoLivre = cmd.replace(/^(envie|envia|mande|manda|compartilhe|encaminhe)\s*(para\s+\w+[\w\s]*?)?\s*/i, '').trim();
        if (!textoLivre || textoLivre.length < 3) {
            addMessage('assistant', '⚠️ Informe o conteúdo da mensagem.\n\nExemplo: "Envie para Lanchonete Express: temos novidade em frangos esta semana!"');
            return true;
        }
        contexto.textoLivre = textoLivre;
    }

    const texto = gerarMensagem(tipo, contexto);
    const nomesDestinos = destinos.filter(d => d.whatsapp).map(d => d.nome);

    // Guardar pendente e mostrar preview
    pendingMsg = { tipo, destinos: destinos.filter(d => d.whatsapp), texto };

    const destinoLabel = nomesDestinos.length === 1
        ? nomesDestinos[0]
        : `${nomesDestinos.length} clientes (${nomesDestinos.join(', ')})`;

    addMessage('assistant',
        `📋 Mensagem pronta para envio:\n\n` +
        `📨 Para: ${destinoLabel}\n` +
        `📱 Via: WhatsApp do Rep (${repData?.telefone || '51981114289'})\n\n` +
        `───────────────────\n${texto}\n───────────────────\n\n` +
        `✅ Diga *"confirma"* para enviar\n❌ Diga *"cancela"* para descartar`
    );
    return true;
}

// ── Confirmar / Cancelar pendente ────────────────────────────────
async function confirmarEnvioPendente() {
    if (!pendingMsg) return;

    const { destinos, texto } = pendingMsg;
    const total = destinos.length;
    let enviados = 0, erros = 0;

    addMessage('assistant', `⏳ Enviando para ${total} destinatário(s)...`);

    for (const dest of destinos) {
        const resultado = await enviarViaAPI(dest.whatsapp, texto);
        if (resultado.success) {
            enviados++;
        } else {
            erros++;
            console.error(`[envio falhou] ${dest.nome}: ${resultado.error}`);
        }
    }

    const statusLabel = !BACKEND_URL ? ' (simulado — configure BACKEND_URL)' : '';
    if (erros === 0) {
        addMessage('assistant',
            `✅ Mensagem enviada com sucesso!${statusLabel}\n\n` +
            `📨 ${enviados}/${total} destinatário(s)\n` +
            destinos.map(d => `   ✓ ${d.nome}`).join('\n'),
            true);
    } else {
        addMessage('assistant',
            `⚠️ Envio parcial${statusLabel}\n\n` +
            `✅ ${enviados} enviados · ❌ ${erros} com erro\n\n` +
            `Verifique os números de WhatsApp dos clientes com erro.`);
    }

    pendingMsg = null;
}

function cancelarEnvioPendente() {
    pendingMsg = null;
    addMessage('assistant', '❌ Envio cancelado.');
}

function buildHelp() {
    if (currentMode === 'geral') {
        return `🤖 Comandos disponíveis no Modo Geral:\n\n• "Consultar estoque de [produto]"\n• "Ver tabela de preços"\n• "Agenda de hoje"\n• "Cadastrar novo cliente"\n• "Registrar visita"\n• "Produtos em oferta"\n\nOu selecione um cliente na carteira para ativar o Modo Cliente.`;
    }
    return `🤖 Comandos disponíveis — ${selectedClient.nome}:\n\n• "Consultar estoque de [produto]"\n• "Histórico de pedidos"\n• "Gerar proposta"\n• "Agendar visita"\n• "Abrir rota"\n• "Sugestão de reposição"\n• "Análise de perfil de compra"\n\nOu diga "No Modo Geral" para voltar.`;
}

// ── VOICE RECOGNITION ─────────────────────────────────────────────
// Sistema de wake word estilo Alexa — único recognition contínuo
//   off → [clique] → standby (verde, escuta "Commercia!")
//               → active (laranja, captura comando)
//               → standby (volta automaticamente)
//
// Um único SpeechRecognition com continuous:true gerencia as duas fases.
// awaitingCommand controla qual fase está ativa.

function setVoicePhase(phase) {
    voicePhase = phase;
    const btn = document.getElementById('voiceBtn');
    btn.classList.remove('listening', 'standby', 'processing');
    if (phase === 'standby') {
        btn.classList.add('standby');
        btn.title = 'Aguardando "Commercia!" — clique para desativar';
    } else if (phase === 'active') {
        btn.classList.add('listening');
        btn.title = 'Ouvindo comando...';
    } else if (phase === 'processing') {
        btn.classList.add('processing');
        btn.title = 'Processando...';
    } else {
        btn.title = 'Ativar modo voz — diga "Commercia!"';
    }
    // limpa preview interim ao mudar de fase
    removeInterimTranscript();
}

// ── Interim transcript preview ──────────────────────────────────────
function showInterimTranscript(text) {
    let el = document.getElementById('interimTranscript');
    if (!el) {
        el = document.createElement('div');
        el.id = 'interimTranscript';
        el.className = 'interim-transcript';
        document.querySelector('.input-area').appendChild(el);
    }
    el.textContent = '🎙️ ' + text;
}

function removeInterimTranscript() {
    const el = document.getElementById('interimTranscript');
    if (el) el.remove();
}

function setupVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognition = new SpeechRecognition();
    recognition.lang           = 'pt-BR';
    recognition.continuous     = true;   // nunca para sozinho
    recognition.interimResults = true;   // detecta wake word enquanto fala

    recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result     = event.results[i];
            const transcript = result[0].transcript.trim();
            const lc         = transcript.toLowerCase();

            if (!awaitingCommand) {
                // ── Fase standby: aguardando "Commercia!" com variações fonéticas ──
                // Detecta: "Commercia", "Comércia", "Comêrcia", "comercia", etc.
                const hasWakeWord = /comé?rcia/i.test(lc) || /comê?rcia/i.test(lc);
                if (hasWakeWord) {
                    awaitingCommand = true;
                    setVoicePhase('active');
                    addMessage('assistant', '🎤 Sim! Pode falar o comando...', true);
                    speak('Sim');
                }
            } else if (!ttsActive) {
                if (!result.isFinal) {
                    // ── Interim: mostra preview do que está sendo reconhecido ──
                    const preview = transcript
                        .replace(/^comé?rcia[!,]?\s*/i, '')
                        .replace(/^comê?rcia[!,]?\s*/i, '')
                        .trim();
                    if (preview.length > 0) showInterimTranscript(preview);
                } else {
                    // ── Fase active: primeiro resultado final = comando ─────
                    // Remove wake word (com variações fonéticas) se o usuário disse tudo na mesma frase
                    const cmd = transcript.replace(/^comé?rcia[!,]?\s*/i, '').replace(/^comê?rcia[!,]?\s*/i, '').trim();
                    if (cmd.length > 1) {
                        awaitingCommand = false;
                        removeInterimTranscript();
                        setVoicePhase('processing');
                        document.getElementById('messageInput').value = cmd;
                        sendMessage();
                        setTimeout(() => setVoicePhase('standby'), 400);
                    }
                    // Se só veio a wake word sem comando, continua ouvindo
                }
            }
        }
    };

    recognition.onend = () => {
        // Browser para após silêncio prolongado — reinicia se ainda ativo
        awaitingCommand = false;
        if (voicePhase === 'standby' || voicePhase === 'active') {
            setVoicePhase('standby');
            setTimeout(() => {
                if (voicePhase !== 'off') {
                    try { recognition.start(); } catch(err) {}
                }
            }, 250);
        }
    };

    recognition.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            if (location.protocol === 'file:') {
                addMessage('assistant',
                    '⚠️ O microfone não funciona quando o arquivo é aberto diretamente pelo Explorer.\n\n' +
                    '✅ Use o atalho correto:\n' +
                    '   Clique duplo em  start.bat  na pasta do app\n\n' +
                    '   Ou abra um terminal na pasta e rode:\n' +
                    '   node -e "require(\'http\').createServer((q,s)=>{const fs=require(\'fs\'),p=require(\'path\');let f=p.join(__dirname,q.url===\'/\'?\'index.html\':q.url);try{s.end(fs.readFileSync(f));}catch(e){s.writeHead(404);s.end();}}).listen(3030,()=>console.log(\'ok\'))"\n\n' +
                    '   Depois acesse: http://localhost:3030');
            } else {
                addMessage('assistant', '⚠️ Permissão de microfone negada. Permita acesso ao microfone nas configurações do browser e recarregue a página.');
            }
            setVoicePhase('off');
            return;
        }
        awaitingCommand = false;
        // Erros transientes (no-speech, aborted, network) — reinicia
        if (voicePhase !== 'off') {
            setTimeout(() => {
                try { recognition.start(); } catch(err) {}
            }, 400);
        }
    };
}

function toggleVoice() {
    if (!recognition) {
        addMessage('assistant', '⚠️ Reconhecimento de voz não suportado neste navegador. Use Chrome ou Edge.');
        return;
    }
    if (voicePhase === 'off') {
        setVoicePhase('standby');
        try {
            recognition.start();
            addMessage('assistant', '🎤 Modo voz ativado', true);
        } catch(e) {
            addMessage('assistant', '⚠️ Não foi possível acessar o microfone. Verifique as permissões do browser.');
            setVoicePhase('off');
        }
    } else {
        // Desligar
        awaitingCommand = false;
        try { recognition.stop(); } catch(e) {}
        setVoicePhase('off');
        addMessage('assistant', '🔇 Modo voz desativado.', true);
    }
}

// ── AVATAR LOADING ────────────────────────────────────────────────

function loadCommerciaAvatar() {
    const avatarImg = document.getElementById('commerciaAvatar');
    if (!avatarImg) return;

    // Placeholder avatar com cor teal enquanto não temos a imagem
    // Quando tiver a imagem, será carregada aqui
    const avatarPlaceholder = document.createElement('div');
    avatarPlaceholder.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4A9BA9, #1a4d54);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 20px;
        border: 2px solid #C1F0F0;
        box-shadow: 0 0 12px rgba(193, 240, 240, 0.4);
    `;
    avatarPlaceholder.textContent = '🤖';
    avatarPlaceholder.title = 'Commercia IA';

    const avatarSection = document.querySelector('.avatar-section');
    if (avatarSection && !avatarImg.src) {
        avatarSection.innerHTML = '';
        avatarSection.appendChild(avatarPlaceholder);
    }
}

function loadCommerciaAvatarToContext() {
    const ctxAvatar = document.getElementById('ctxAvatarGeral');
    if (!ctxAvatar) return;

    const img = new Image();
    img.onload = () => {
        ctxAvatar.innerHTML = '';
        const avatarImg = document.createElement('img');
        avatarImg.src = 'Commercia.png';
        avatarImg.style.cssText = `
            width: 44px;
            height: 44px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid var(--teal);
        `;
        avatarImg.alt = 'Commercia IA';
        ctxAvatar.appendChild(avatarImg);
    };
    img.onerror = () => {
        // Fallback: manter o emoji se imagem não carregar
    };
    img.src = 'Commercia.png';
}

// ── TEXT-TO-SPEECH ────────────────────────────────────────────────

function setupTTS() {
    if (!window.speechSynthesis) return;

    const loadVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const ptBR   = voices.filter(v => v.lang === 'pt-BR' || v.lang === 'pt_BR');

        // Nomes de vozes femininas conhecidas (Windows, macOS, Chrome, Edge)
        const femaleNames = ['francisca', 'maria', 'vitória', 'vitoria', 'lana',
                             'leila', 'luciana', 'camila', 'female', 'feminina',
                             'woman', 'karen', 'zira', 'cortana', 'siri', 'google us english female'];

        ttsVoice =
            // 1ª prioridade: voz pt-BR cujo nome contenha indicativo feminino
            ptBR.find(v => femaleNames.some(n => v.name.toLowerCase().includes(n)))
            // 2ª prioridade: primeira voz pt-BR com atributo female
            || ptBR.find(v => v.name.toLowerCase().includes('female') || !v.name.toLowerCase().includes('male'))
            // 3ª prioridade: qualquer voz pt-BR
            || ptBR[0]
            // 4ª prioridade: qualquer voz em português
            || voices.find(v => v.lang.startsWith('pt'))
            || null;

        // Force female pitch if available
        if (ttsVoice) {
            ttsVoice.pitch = 1.2;
        }
    };

    loadVoice();
    // onvoiceschanged dispara quando o browser carrega as vozes (assíncrono)
    window.speechSynthesis.onvoiceschanged = loadVoice;
}

// ── Pré-processamento de texto para fala natural em pt-BR ─────────
// Converte abreviações do mercado (kg, cx, un, R$, /, etc.) para
// linguagem falada coloquial — igual ao rep usaria em campo.

function preprocessForSpeech(text) {
    // Strip título (primeira linha) se mensagem tem mais de uma linha
    const lines = text.split('\n');
    if (lines.length > 1) {
        const remaining = lines.slice(1).join('\n').trim();
        if (remaining) text = remaining;
    }

    // Strip rodapé (último parágrafo se for call-to-action)
    const paras = text.split('\n\n');
    if (paras.length > 1) {
        const last = paras[paras.length - 1].trim();
        if (last.startsWith('Deseja') || (last.endsWith('?') && last.length < 150)) {
            const remaining = paras.slice(0, -1).join('\n\n').trim();
            if (remaining) text = remaining;
        }
    }

    return text
        // ── Valores monetários ────────────────────────────────────
        // R$ 226,80 → "duzentos e vinte e seis reais e 80 centavos"
        // (deixa o número em dígitos; o browser pronuncia em pt-BR)
        .replace(/R\$\s*(\d+)[,.](\d{2})/g, (_, int, dec) => {
            const cents = parseInt(dec, 10);
            return cents > 0
                ? `${int} reais e ${cents} centavos`
                : `${int} reais`;
        })
        .replace(/R\$\s*(\d+)/g, '$1 reais')

        // ── Parênteses primeiro (mais específico) ────────────────────
        // "(12 un)" → "com 12 unidades"  ← deve rodar ANTES das regras soltas
        .replace(/\((\d+)\s*un\)/gi, (_, n) =>
            `com ${n} ${parseInt(n, 10) === 1 ? 'unidade' : 'unidades'}`)
        .replace(/\((\d+)\s*cx\)/gi, (_, n) =>
            `com ${n} ${parseInt(n, 10) === 1 ? 'caixa' : 'caixas'}`)
        .replace(/\((\d+)\s*kg\)/gi, (_, n) =>
            `com ${n} ${parseInt(n, 10) === 1 ? 'quilo' : 'quilos'}`)

        // ── Unidades de medida com número à frente ────────────────
        // "1 kg" → "1 quilo" | "5 kg" → "5 quilos"
        .replace(/(\d+)\s*kg\b/gi, (_, n) =>
            `${n} ${parseInt(n, 10) === 1 ? 'quilo' : 'quilos'}`)

        // "1 un" → "1 unidade" | "12 un" → "12 unidades"
        .replace(/(\d+)\s*un\b/gi, (_, n) =>
            `${n} ${parseInt(n, 10) === 1 ? 'unidade' : 'unidades'}`)

        // "1 cx" → "1 caixa" | "6 cx" → "6 caixas"
        .replace(/(\d+)\s*cx\b/gi, (_, n) =>
            `${n} ${parseInt(n, 10) === 1 ? 'caixa' : 'caixas'}`)

        // ── Separadores e símbolos ────────────────────────────────
        // "R$ 226.80/cx" → "... a caixa"  (barra = "a")
        .replace(/\s*\/\s*cx\b/gi, ' a caixa')
        .replace(/\s*\/\s*un\b/gi, ' a unidade')
        .replace(/\s*\/\s*kg\b/gi, ' a quilo')
        .replace(/\s*\/\s*/g,      ' a ')

        // Caracteres que não devem ser pronunciados
        .replace(/[|()\[\]•]/g, ' ')

        // ── Limpeza de emojis e símbolos gráficos (ranges completos) ──
        .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')   // emoji do plano suplementar
        .replace(/[←-⟿⬀-⯿]/g, '') // setas, símbolos, dingbats

        // ── Quebras de linha → pausa natural ──────────────────────
        .replace(/\n+/g, '. ')

        // Espaços extras
        .replace(/\s{2,}/g, ' ')
        .trim();
}

async function speak(text) {
    stopAudio();
    const clean = preprocessForSpeech(text);
    if (!clean) return;
    ttsActive = true;
    try {
        const resp = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: { text: clean },
                    voice: { languageCode: 'pt-BR', name: 'pt-BR-Neural2-C', ssmlGender: 'FEMALE' },
                    audioConfig: { audioEncoding: 'MP3', speakingRate: 1.15, pitch: 1.0 }
                })
            }
        );
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const { audioContent } = await resp.json();
        const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
        currentAudio = audio;
        audio.onended = () => { currentAudio = null; setTimeout(() => { ttsActive = false; }, 300); };
        audio.onerror = () => { currentAudio = null; ttsActive = false; speakFallback(clean); };
        audio.play().catch(err => { console.error('play error:', err); ttsActive = false; });
    } catch (err) {
        console.error('Google TTS erro:', err.message);
        ttsActive = false;
        speakFallback(clean);
    }
}

function speakFallback(clean) {
    if (!window.speechSynthesis) return;
    ttsActive = true;
    const utterance  = new SpeechSynthesisUtterance(clean);
    utterance.lang   = 'pt-BR';
    utterance.rate   = 1.2;
    utterance.pitch  = 1.15;
    if (ttsVoice) utterance.voice = ttsVoice;
    utterance.onend = () => { setTimeout(() => { ttsActive = false; }, 300); };
    window.speechSynthesis.speak(utterance);
}

// ── OUTPUT MODE ───────────────────────────────────────────────────

function setupOutputMode() {
    document.querySelectorAll('.output-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            outputMode = btn.dataset.mode;
            document.querySelectorAll('.output-mode-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll(`.output-mode-btn[data-mode="${outputMode}"]`).forEach(b => b.classList.add('active'));
            if (outputMode === 'texto') stopAudio();
            const labels = { 'texto': '🔊 Resposta em texto', 'texto-voz': '🔊 Resposta em texto e voz', 'voz': '🔊 Resposta em voz' };
            addMessage('assistant', labels[outputMode], true);
        });
    });
}

// ── UTILS ─────────────────────────────────────────────────────────

console.log('Commercia IA — App carregado · MVP v1.0');
console.log('Arquitetura: Modo Cliente (F1-F10) + Modo Geral (F11-F16)');
