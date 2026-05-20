const carrito = [];
let domicilioSeleccionado = false;
let categoriaActual = "inicio";
let chatbotEscuchando = false;
let chatbotReconocimiento = null;
let chatbotMensajes = [];
let chatbotOpcionesVisibles = true;
let chatbotActionOptions = [];
let chatbotBackendStatusLabel = "En linea";
const CHATBOT_AUDIO_STORAGE_KEY = "mercaappChatbotAudio";
const ACCESSIBILITY_STORAGE_KEY = "mercaappAccessibility";
const ACCESSIBILITY_DEFAULTS = {
    darkMode: false,
    highContrast: false,
    reducedMotion: false,
    underlinedLinks: false,
    largeCursor: false,
    fontScale: 100,
};

const carritoElemento = document.getElementById("carrito");
const carritoBackdrop = document.getElementById("carrito-backdrop");
const itemsCarrito = document.getElementById("items-carrito");
const totalElemento = document.getElementById("total");
const contadorElemento = document.getElementById("contador");
const tipoEntregaElemento = document.getElementById("tipo-entrega");
const mensajeCarritoElemento = document.getElementById("mensaje-carrito");
const toggleCarritoBoton = document.getElementById("toggle-carrito");
const cerrarCarritoBoton = document.getElementById("cerrar-carrito");
const pedirDomicilioBoton = document.getElementById("pedir-domicilio");
const hacerPedidoBoton = document.getElementById("hacer-pedido");
const vaciarCarritoBoton = document.getElementById("vaciar-carrito");

const toggleBusquedaBoton = document.getElementById("toggle-busqueda");
const busquedaPanel = document.getElementById("busqueda-panel");
const busquedaInput = document.getElementById("busqueda-producto");
const mensajeBusquedaElemento = document.getElementById("mensaje-busqueda");
const productosCards = Array.from(document.querySelectorAll(".card"));
const heroSection = document.querySelector(".hero");
const menuBotones = Array.from(document.querySelectorAll(".menu-btn"));

const toggleUsuarioBoton = document.getElementById("toggle-usuario");
const usuarioPanel = document.getElementById("usuario-panel");
const usuarioNombreElemento = document.getElementById("usuario-nombre");
const usuarioHandleElemento = document.getElementById("usuario-handle");
const usuarioCorreoElemento = document.getElementById("usuario-correo");
const usuarioTelefonoElemento = document.getElementById("usuario-telefono");
const usuarioEstadoElemento = document.getElementById("usuario-estado");
const usuarioDireccionElemento = document.getElementById("usuario-direccion");
const usuarioAccesoElemento = document.getElementById("usuario-acceso");
const usuarioInicialElemento = document.getElementById("usuario-inicial");

const chatbotToggleBoton = document.getElementById("chatbot-toggle");
const chatbotPanel = document.getElementById("chatbot-panel");
const chatbotCloseBoton = document.getElementById("chatbot-close");
const chatbotClearBoton = document.getElementById("chatbot-clear");
const chatbotAudioToggleBoton = document.getElementById("chatbot-audio-toggle");
const chatbotMessagesElemento = document.getElementById("chatbot-messages");
const chatbotQuickOptionsElemento = document.getElementById("chatbot-quick-options");
const chatbotForm = document.getElementById("chatbot-form");
const chatbotInput = document.getElementById("chatbot-input");
const chatbotMicBoton = document.getElementById("chatbot-mic");
const chatbotStatusTexto = document.getElementById("chatbot-status-text");
const chatbotQuickToggleBoton = document.getElementById("chatbot-quick-toggle");
const accessibilityToggleBoton = document.getElementById("accessibility-toggle");
const accessibilityPanel = document.getElementById("accessibility-panel");
const accessibilityCloseBoton = document.getElementById("accessibility-close");
const accessibilityResetBoton = document.getElementById("accessibility-reset");
const darkModeBoton = document.getElementById("toggle-dark-mode");
const highContrastBoton = document.getElementById("toggle-high-contrast");
const reducedMotionBoton = document.getElementById("toggle-reduced-motion");
const underlinedLinksBoton = document.getElementById("toggle-underlined-links");
const largeCursorBoton = document.getElementById("toggle-large-cursor");
const decreaseFontSizeBoton = document.getElementById("decrease-font-size");
const increaseFontSizeBoton = document.getElementById("increase-font-size");
const fontSizeValueElemento = document.getElementById("font-size-value");
const accessibilityFontSummaryElemento = document.getElementById("accessibility-font-summary");

let accessibilitySettings = cargarAccesibilidadGuardada();
let chatbotQuickMenuAbierto = false;
let chatbotAudioActivo = cargarPreferenciaAudioChatbot();
let chatbotUltimoMensajeLeidoId = "";

const categoriasPorId = Object.fromEntries(
    menuBotones.map((boton) => [boton.dataset.categoria || "", (boton.textContent || "").trim()])
);

const catalogoProductos = productosCards.map((card) => {
    const nombre = (card.querySelector("h3")?.textContent || "").trim();
    const precio = (card.querySelector(".product-price")?.textContent || "").trim();
    const descripcion = (card.querySelector(".product-description")?.textContent || "").trim();
    const agregarBoton = card.querySelector(".agregar-producto");

    return {
        id: agregarBoton?.dataset.id || "",
        nombre,
        nombreNormalizado: normalizarTexto(nombre),
        precio,
        precioNumero: Number.parseInt(agregarBoton?.dataset.precio || "0", 10),
        stock: Number.parseInt(agregarBoton?.dataset.stock || "0", 10),
        imagen: agregarBoton?.dataset.imagen || "",
        descripcion,
        categoria: card.dataset.categoria || "inicio",
        categoriaLabel: categoriasPorId[card.dataset.categoria || ""] || "Catalogo",
        disponible: !(agregarBoton && agregarBoton.hasAttribute("disabled")),
    };
});

const opcionesRapidasChatbot = [
    { id: "buscar", label: "Quiero buscar producto" },
    { id: "pedido", label: "Quiero hacer pedido" },
    { id: "domicilio", label: "Quiero pedir domicilio" },
];

const CHATBOT_STOP_WORDS = new Set([
    "que",
    "quiero",
    "para",
    "tienen",
    "producto",
    "productos",
    "buscar",
    "precio",
    "costo",
    "cuanto",
    "cuantas",
    "hay",
    "de",
    "del",
    "con",
    "una",
    "uno",
    "hacer",
    "pedido",
    "domicilio",
    "envio",
    "entrega",
    "stock",
    "disponible",
    "cantidad",
    "unidades",
    "favor",
    "busca",
    "buscame",
    "muestrame",
    "ver",
]);

const CHATBOT_OFF_TOPIC_KEYWORDS = [
    "futbol",
    "partido",
    "musica",
    "pelicula",
    "serie",
    "novia",
    "novio",
    "politica",
    "presidente",
    "trabajo",
    "universidad",
    "colegio",
    "clima",
    "lluvia",
    "sol",
    "juego",
    "videojuego",
    "amor",
    "salud",
    "religion",
];

const CHATBOT_WHATSAPP_RETRY_KEYWORDS = [
    "no se me abrio el whatsapp",
    "no se me abrio whatsapp",
    "no se abrio el whatsapp",
    "no se abrio whatsapp",
    "no abre whatsapp",
    "abrir whatsapp",
    "abre whatsapp",
    "mandame el whatsapp",
    "enviame el whatsapp",
    "reenviar whatsapp",
    "reabrir whatsapp",
    "comunicarme con el dueno",
    "hablar con el dueno",
    "contactar al dueno",
];

function normalizarTexto(texto) {
    return (texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function escaparHTML(texto) {
    return (texto || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatearPrecio(valor) {
    return `$${Number(valor || 0).toLocaleString("es-CO")}`;
}

function elegirVarianteChatbot(seedText, opciones) {
    if (!Array.isArray(opciones) || opciones.length === 0) {
        return "";
    }

    const seed = Array.from(String(seedText || ""))
        .reduce((total, caracter) => total + caracter.charCodeAt(0), 0);

    return opciones[seed % opciones.length];
}

function cargarAccesibilidadGuardada() {
    try {
        const rawSettings = localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);

        if (!rawSettings) {
            return { ...ACCESSIBILITY_DEFAULTS };
        }

        const parsedSettings = JSON.parse(rawSettings);
        const fontScale = Number.parseInt(parsedSettings.fontScale, 10);

        return {
            darkMode: Boolean(parsedSettings.darkMode),
            highContrast: Boolean(parsedSettings.highContrast),
            reducedMotion: Boolean(parsedSettings.reducedMotion),
            underlinedLinks: Boolean(parsedSettings.underlinedLinks),
            largeCursor: Boolean(parsedSettings.largeCursor),
            fontScale: Number.isFinite(fontScale)
                ? Math.min(130, Math.max(85, fontScale))
                : ACCESSIBILITY_DEFAULTS.fontScale,
        };
    } catch (error) {
        return { ...ACCESSIBILITY_DEFAULTS };
    }
}

function guardarAccesibilidad() {
    localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(accessibilitySettings));
}

function cargarPreferenciaAudioChatbot() {
    try {
        return localStorage.getItem(CHATBOT_AUDIO_STORAGE_KEY) === "true";
    } catch (error) {
        return false;
    }
}

function guardarPreferenciaAudioChatbot() {
    try {
        localStorage.setItem(CHATBOT_AUDIO_STORAGE_KEY, chatbotAudioActivo ? "true" : "false");
    } catch (error) {
        // Ignoramos errores de almacenamiento local.
    }
}

function actualizarBotonAudioChatbot() {
    if (!chatbotAudioToggleBoton) {
        return;
    }

    chatbotAudioToggleBoton.classList.toggle("activo", chatbotAudioActivo);
    chatbotAudioToggleBoton.textContent = chatbotAudioActivo ? "Audio on" : "Audio";
    chatbotAudioToggleBoton.setAttribute("aria-pressed", chatbotAudioActivo ? "true" : "false");
    chatbotAudioToggleBoton.setAttribute(
        "aria-label",
        chatbotAudioActivo ? "Desactivar voz del asistente" : "Activar voz del asistente"
    );
}

function detenerAudioChatbot() {
    if (!window.speechSynthesis) {
        return;
    }

    window.speechSynthesis.cancel();
}

function obtenerVozChatbot() {
    if (!window.speechSynthesis) {
        return null;
    }

    const voces = window.speechSynthesis.getVoices();

    return (
        voces.find((voz) => /es(-|_)?CO/i.test(voz.lang))
        || voces.find((voz) => /^es/i.test(voz.lang))
        || null
    );
}

function hablarMensajeChatbot(texto) {
    if (!chatbotAudioActivo || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        return;
    }

    const contenido = String(texto || "").trim();

    if (!contenido) {
        return;
    }

    detenerAudioChatbot();

    const utterance = new SpeechSynthesisUtterance(contenido);
    const voz = obtenerVozChatbot();

    utterance.lang = voz?.lang || "es-CO";
    utterance.voice = voz;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
}

function alternarAudioChatbot() {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        agregarMensajeChatbot(
            "Tu navegador no soporta voz para leer respuestas. Puedes usar Chrome o Edge.",
            "bot"
        );
        return;
    }

    chatbotAudioActivo = !chatbotAudioActivo;
    guardarPreferenciaAudioChatbot();
    actualizarBotonAudioChatbot();

    if (!chatbotAudioActivo) {
        detenerAudioChatbot();
        return;
    }

    const ultimoMensajeBot = [...chatbotMensajes].reverse().find((mensaje) => mensaje.sender === "bot");

    if (ultimoMensajeBot) {
        chatbotUltimoMensajeLeidoId = ultimoMensajeBot.id;
        hablarMensajeChatbot(ultimoMensajeBot.text);
    }
}

function actualizarSwitchAccesibilidad(boton, activo) {
    if (!boton) {
        return;
    }

    boton.classList.toggle("activo", activo);
    boton.setAttribute("aria-checked", activo ? "true" : "false");
}

function actualizarEtiquetaTamano() {
    const label = `${accessibilitySettings.fontScale}%`;

    if (fontSizeValueElemento) {
        fontSizeValueElemento.textContent = label;
    }

    if (accessibilityFontSummaryElemento) {
        accessibilityFontSummaryElemento.textContent = label;
    }

    if (decreaseFontSizeBoton) {
        decreaseFontSizeBoton.disabled = accessibilitySettings.fontScale <= 85;
    }

    if (increaseFontSizeBoton) {
        increaseFontSizeBoton.disabled = accessibilitySettings.fontScale >= 130;
    }
}

function aplicarPreferenciasAccesibilidad() {
    document.body.classList.toggle("theme-dark", accessibilitySettings.darkMode);
    document.body.classList.toggle("theme-high-contrast", accessibilitySettings.highContrast);
    document.body.classList.toggle("reduce-motion", accessibilitySettings.reducedMotion);
    document.body.classList.toggle("underline-links", accessibilitySettings.underlinedLinks);
    document.body.classList.toggle("large-cursor", accessibilitySettings.largeCursor);
    document.documentElement.style.setProperty("--font-scale", `${accessibilitySettings.fontScale / 100}`);

    actualizarSwitchAccesibilidad(darkModeBoton, accessibilitySettings.darkMode);
    actualizarSwitchAccesibilidad(highContrastBoton, accessibilitySettings.highContrast);
    actualizarSwitchAccesibilidad(reducedMotionBoton, accessibilitySettings.reducedMotion);
    actualizarSwitchAccesibilidad(underlinedLinksBoton, accessibilitySettings.underlinedLinks);
    actualizarSwitchAccesibilidad(largeCursorBoton, accessibilitySettings.largeCursor);
    actualizarEtiquetaTamano();
}

function alternarAjusteAccesibilidad(key) {
    accessibilitySettings[key] = !accessibilitySettings[key];
    guardarAccesibilidad();
    aplicarPreferenciasAccesibilidad();
}

function ajustarTamanoFuente(delta) {
    const nextValue = Math.min(130, Math.max(85, accessibilitySettings.fontScale + delta));

    if (nextValue === accessibilitySettings.fontScale) {
        return;
    }

    accessibilitySettings.fontScale = nextValue;
    guardarAccesibilidad();
    aplicarPreferenciasAccesibilidad();
}

function restablecerAccesibilidad() {
    accessibilitySettings = { ...ACCESSIBILITY_DEFAULTS };
    guardarAccesibilidad();
    aplicarPreferenciasAccesibilidad();
}

function toggleAccessibilityPanel(forzarEstado) {
    if (!accessibilityPanel || !accessibilityToggleBoton) {
        return;
    }

    const activar = typeof forzarEstado === "boolean"
        ? forzarEstado
        : !accessibilityPanel.classList.contains("activo");

    accessibilityPanel.classList.toggle("activo", activar);
    accessibilityPanel.setAttribute("aria-hidden", activar ? "false" : "true");
    accessibilityToggleBoton.setAttribute("aria-expanded", activar ? "true" : "false");

    if (activar) {
        cerrarBusqueda();
        cerrarUsuario();
        toggleChatbot(false);
        toggleCarrito(false);
    }
}

function inicializarAccesibilidad() {
    aplicarPreferenciasAccesibilidad();

    if (!accessibilityPanel || !accessibilityToggleBoton) {
        return;
    }

    accessibilityToggleBoton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleAccessibilityPanel();
    });

    if (accessibilityCloseBoton) {
        accessibilityCloseBoton.addEventListener("click", () => toggleAccessibilityPanel(false));
    }

    if (accessibilityResetBoton) {
        accessibilityResetBoton.addEventListener("click", restablecerAccesibilidad);
    }

    if (darkModeBoton) {
        darkModeBoton.addEventListener("click", () => alternarAjusteAccesibilidad("darkMode"));
    }

    if (highContrastBoton) {
        highContrastBoton.addEventListener("click", () => alternarAjusteAccesibilidad("highContrast"));
    }

    if (reducedMotionBoton) {
        reducedMotionBoton.addEventListener("click", () => alternarAjusteAccesibilidad("reducedMotion"));
    }

    if (underlinedLinksBoton) {
        underlinedLinksBoton.addEventListener("click", () => alternarAjusteAccesibilidad("underlinedLinks"));
    }

    if (largeCursorBoton) {
        largeCursorBoton.addEventListener("click", () => alternarAjusteAccesibilidad("largeCursor"));
    }

    if (decreaseFontSizeBoton) {
        decreaseFontSizeBoton.addEventListener("click", () => ajustarTamanoFuente(-5));
    }

    if (increaseFontSizeBoton) {
        increaseFontSizeBoton.addEventListener("click", () => ajustarTamanoFuente(5));
    }
}

function obtenerHoraChat(fecha = new Date()) {
    return fecha.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function normalizarFechaChatbot(valor) {
    if (!valor) {
        return new Date();
    }

    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? new Date() : fecha;
}

function resolverImagenChatbot(metadata = {}) {
    const imagePath = metadata.image_url || metadata.image_path || metadata.imagen || "";

    if (!imagePath) {
        return "";
    }

    if (
        imagePath.startsWith("http://")
        || imagePath.startsWith("https://")
        || imagePath.startsWith("/static/")
        || imagePath.startsWith("data:")
    ) {
        return imagePath;
    }

    return `/static/${String(imagePath).replace(/^\/+/, "")}`;
}

function crearMetadataProductoChat(producto, showStock = false) {
    if (!producto) {
        return {};
    }

    return {
        product_id: producto.id,
        product_name: producto.nombre,
        price_display: producto.precio,
        product_stock: producto.stock,
        show_stock: showStock,
        image_url: producto.imagen,
    };
}

function obtenerProductoCatalogoPorId(productId) {
    const id = String(productId || "");
    return catalogoProductos.find((producto) => String(producto.id) === id) || null;
}

function construirOpcionesCarritoChatbot() {
    if (carrito.length === 0) {
        return [{ id: "buscar", label: "Buscar otro producto" }];
    }

    return [
        { id: "cart-open", label: "Ver carrito", kind: "action", action: "open_cart" },
        { id: "cart-pickup", label: "Crear pedido", kind: "checkout", delivery_type: "pickup" },
        { id: "cart-delivery", label: "Pedir domicilio", kind: "checkout", delivery_type: "delivery" },
    ];
}

function crearMensajeChatbot(texto, sender, timestamp = new Date(), id = "", metadata = {}) {
    return {
        id: id || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        text: texto,
        sender,
        timestamp: normalizarFechaChatbot(timestamp),
        metadata: metadata || {},
    };
}

function renderizarVistaProductoChat(metadata = {}) {
    const productName = metadata.product_name || "";
    const priceDisplay = metadata.price_display || "";
    const rawStock = metadata.product_stock;
    const showStock = Boolean(metadata.show_stock);
    const hasStock = rawStock !== undefined && rawStock !== null && rawStock !== "";
    const imageUrl = resolverImagenChatbot(metadata);

    if (!productName && !priceDisplay && !imageUrl) {
        return "";
    }

    const stockLabel = hasStock && (showStock || Number(rawStock) <= 0)
        ? Number(rawStock) > 0
            ? `${rawStock} unidades disponibles`
            : "Producto agotado"
        : "";

    return `
        <div class="chatbot-product-preview">
            ${imageUrl ? `<img src="${escaparHTML(imageUrl)}" alt="${escaparHTML(productName || "Producto")}">` : ""}
            <div class="chatbot-product-copy">
                ${productName ? `<strong>${escaparHTML(productName)}</strong>` : ""}
                ${priceDisplay ? `<span>${escaparHTML(priceDisplay)}</span>` : ""}
                ${stockLabel ? `<small>${escaparHTML(stockLabel)}</small>` : ""}
            </div>
        </div>
    `;
}

function renderizarMensajesChatbot() {
    if (!chatbotMessagesElemento) {
        return;
    }

    chatbotMessagesElemento.innerHTML = chatbotMensajes
        .map((mensaje) => `
            <div class="chatbot-message-row ${mensaje.sender}">
                <div class="chatbot-bubble">
                    ${mensaje.sender === "bot" ? renderizarVistaProductoChat(mensaje.metadata) : ""}
                    <p>${escaparHTML(mensaje.text).replace(/\n/g, "<br>")}</p>
                    <time>${obtenerHoraChat(mensaje.timestamp)}</time>
                </div>
            </div>
        `)
        .join("");

    chatbotMessagesElemento.scrollTop = chatbotMessagesElemento.scrollHeight;
}

function renderizarOpcionesRapidasChatbot() {
    if (!chatbotQuickOptionsElemento) {
        return;
    }

    if (!chatbotOpcionesVisibles) {
        chatbotQuickOptionsElemento.innerHTML = "";
        chatbotQuickOptionsElemento.classList.add("oculto");
        if (chatbotQuickToggleBoton) {
            chatbotQuickToggleBoton.classList.add("oculto");
            chatbotQuickToggleBoton.setAttribute("aria-expanded", "false");
        }
        chatbotQuickMenuAbierto = false;
        return;
    }

    const opciones = chatbotActionOptions.length > 0 ? chatbotActionOptions : opcionesRapidasChatbot;
    if (chatbotQuickToggleBoton) {
        chatbotQuickToggleBoton.classList.remove("oculto");
    }

    chatbotQuickOptionsElemento.innerHTML = `
        <div class="chatbot-quick-grid">
            ${opciones.map((opcion) => `
                <button
                    type="button"
                    class="chatbot-quick-option"
                    data-chatbot-option="${escaparHTML(opcion.id)}"
                    data-chatbot-kind="${escaparHTML(opcion.kind || "message")}"
                    data-chatbot-action="${escaparHTML(opcion.action || "")}"
                    data-delivery-type="${escaparHTML(opcion.delivery_type || "")}"
                    data-product-id="${escaparHTML(String(opcion.product_id || ""))}"
                >
                    ${escaparHTML(opcion.label)}
                </button>
            `).join("")}
        </div>
    `;

    chatbotQuickOptionsElemento.classList.toggle("oculto", !chatbotQuickMenuAbierto);

    if (chatbotQuickToggleBoton) {
        chatbotQuickToggleBoton.setAttribute("aria-expanded", chatbotQuickMenuAbierto ? "true" : "false");
    }
}

function toggleQuickOptionsChatbot(forzarEstado) {
    if (!chatbotQuickOptionsElemento || !chatbotQuickToggleBoton || chatbotQuickToggleBoton.classList.contains("oculto")) {
        return;
    }

    chatbotQuickMenuAbierto = typeof forzarEstado === "boolean"
        ? forzarEstado
        : !chatbotQuickMenuAbierto;

    chatbotQuickOptionsElemento.classList.toggle("oculto", !chatbotQuickMenuAbierto);
    chatbotQuickToggleBoton.setAttribute("aria-expanded", chatbotQuickMenuAbierto ? "true" : "false");
}

function agregarMensajeChatbot(texto, sender, metadata = {}) {
    const mensaje = crearMensajeChatbot(texto, sender, new Date(), "", metadata);
    chatbotMensajes.push(mensaje);
    renderizarMensajesChatbot();

    if (sender === "bot" && mensaje.id !== chatbotUltimoMensajeLeidoId) {
        chatbotUltimoMensajeLeidoId = mensaje.id;
        hablarMensajeChatbot(mensaje.text);
    }
}

function cargarSaludoInicialChatbot() {
    chatbotMensajes = [
        crearMensajeChatbot("Hola. Soy tu asistente virtual. En que te puedo ayudar hoy?", "bot"),
    ];
    chatbotActionOptions = [];
    chatbotOpcionesVisibles = true;
    chatbotQuickMenuAbierto = false;
    chatbotUltimoMensajeLeidoId = chatbotMensajes[0]?.id || "";
    renderizarMensajesChatbot();
    renderizarOpcionesRapidasChatbot();
}

function obtenerUsuarioGuardado() {
    try {
        const usuarioGuardado = localStorage.getItem("mercaappUsuario");
        return usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
    } catch (error) {
        return null;
    }
}

function guardarUsuarioGuardado(usuario) {
    localStorage.setItem("mercaappUsuario", JSON.stringify(usuario));
}

async function cargarUsuarioDesdeBackend() {
    const response = await fetch("/api/me");

    if (!response.ok) {
        throw new Error("No fue posible cargar tu perfil.");
    }

    const payload = await response.json();

    if (!payload.ok) {
        throw new Error(payload.error || "No fue posible cargar tu perfil.");
    }

    guardarUsuarioGuardado(payload.user);
    return payload.user;
}

function actualizarEstadoVoz(escuchando) {
    chatbotEscuchando = escuchando;

    if (chatbotMicBoton) {
        chatbotMicBoton.classList.toggle("escuchando", escuchando);
        chatbotMicBoton.textContent = escuchando ? "Parar" : "Voz";
        chatbotMicBoton.setAttribute("aria-label", escuchando ? "Detener voz" : "Activar voz");
    }

    if (chatbotStatusTexto) {
        chatbotStatusTexto.textContent = escuchando ? "Escuchando..." : chatbotBackendStatusLabel;
    }
}

async function cargarEstadoChatbot() {
    if (!chatbotStatusTexto) {
        return;
    }

    try {
        const response = await fetch("/api/chatbot/status");
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload.ok) {
            throw new Error("Estado no disponible");
        }

        if (payload.label) {
            chatbotBackendStatusLabel = payload.label;
        } else {
            chatbotBackendStatusLabel = payload.configured
                ? `IA activa - ${payload.model}`
                : "En linea - modo local";
        }
        chatbotStatusTexto.textContent = chatbotEscuchando ? "Escuchando..." : chatbotBackendStatusLabel;
    } catch (error) {
        chatbotBackendStatusLabel = "En linea";
        chatbotStatusTexto.textContent = chatbotEscuchando ? "Escuchando..." : chatbotBackendStatusLabel;
    }
}

async function cargarHistorialChatbot() {
    try {
        const response = await fetch("/api/chatbot/history");
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload.ok) {
            throw new Error("Historial no disponible");
        }

        const mensajes = Array.isArray(payload.messages) ? payload.messages : [];

        if (mensajes.length === 0) {
            cargarSaludoInicialChatbot();
            return;
        }

        chatbotMensajes = mensajes.map((item, index) =>
            crearMensajeChatbot(
                item.message || "",
                item.role === "bot" ? "bot" : "user",
                item.created_at,
                `db-${index}`,
                item.metadata || {}
            )
        );
        chatbotUltimoMensajeLeidoId = [...chatbotMensajes].reverse().find((mensaje) => mensaje.sender === "bot")?.id || "";
        chatbotActionOptions = Array.isArray(payload.contextual_options) ? payload.contextual_options : [];
        chatbotOpcionesVisibles = true;
        chatbotQuickMenuAbierto = false;
        renderizarMensajesChatbot();
        renderizarOpcionesRapidasChatbot();
    } catch (error) {
        cargarSaludoInicialChatbot();
    }
}

async function borrarHistorialChatbot() {
    const response = await fetch("/api/chatbot/history", {
        method: "DELETE",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "No pudimos borrar el historial del chat.");
    }

    return payload;
}

function iniciarReconocimientoVoz() {
    if (!chatbotInput) {
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        agregarMensajeChatbot(
            "Tu navegador no soporta reconocimiento de voz. Puedes usar Chrome o Edge.",
            "bot"
        );
        return;
    }

    chatbotReconocimiento = new SpeechRecognition();
    chatbotReconocimiento.lang = "es-CO";
    chatbotReconocimiento.continuous = false;
    chatbotReconocimiento.interimResults = false;

    chatbotReconocimiento.onstart = () => {
        actualizarEstadoVoz(true);
    };

    chatbotReconocimiento.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        chatbotInput.value = transcript;
        chatbotInput.focus();
    };

    chatbotReconocimiento.onerror = () => {
        actualizarEstadoVoz(false);
    };

    chatbotReconocimiento.onend = () => {
        actualizarEstadoVoz(false);
    };

    chatbotReconocimiento.start();
}

async function manejarBorradoChatbot() {
    if (!window.confirm("Se borrara el historial del chat. Deseas continuar?")) {
        return;
    }

    const textoOriginal = chatbotClearBoton ? chatbotClearBoton.textContent : "";

    if (chatbotClearBoton) {
        chatbotClearBoton.disabled = true;
        chatbotClearBoton.textContent = "Borrando...";
    }

    try {
        await borrarHistorialChatbot();
        cargarSaludoInicialChatbot();
    } catch (error) {
        responderDesdeChatbot(error.message || "No pudimos borrar el historial del chat.");
    } finally {
        if (chatbotClearBoton) {
            chatbotClearBoton.disabled = false;
            chatbotClearBoton.textContent = textoOriginal || "Borrar";
        }
    }
}

function detenerReconocimientoVoz() {
    if (chatbotReconocimiento) {
        chatbotReconocimiento.stop();
    }

    actualizarEstadoVoz(false);
}

function abrirBuscadorDesdeChat(texto = "") {
    cerrarUsuario();

    if (!busquedaPanel) {
        return;
    }

    if (categoriaActual !== "inicio") {
        cambiarCategoria("inicio");
    }

    busquedaPanel.classList.add("activo");

    if (busquedaInput) {
        busquedaInput.value = texto;
        filtrarProductos();
        busquedaInput.focus();
    }
}

function encontrarProductoRelacionado(texto) {
    if (!texto) {
        return null;
    }

    const tokens = texto
        .split(/\s+/)
        .filter((palabra) => palabra.length >= 3 && !CHATBOT_STOP_WORDS.has(palabra));

    const exacto = catalogoProductos.find((producto) => texto.includes(producto.nombreNormalizado));

    if (exacto) {
        return exacto;
    }

    return catalogoProductos.find((producto) =>
        tokens.some((token) => producto.nombreNormalizado.includes(token))
    ) || null;
}

function respuestaLocalChatbot(userInput) {
    const input = normalizarTexto(userInput);
    const producto = encontrarProductoRelacionado(input);
    const pareceBusqueda = [
        "buscar",
        "busca",
        "buscame",
        "muestrame",
        "producto",
        "precio",
        "costo",
        "cuanto",
        "stock",
        "disponible",
        "quiero",
        "necesito",
    ].some((keyword) => input.includes(keyword));

    if (input.includes("hola") || input.includes("buenas") || input.includes("buenos")) {
        return {
            reply: elegirVarianteChatbot(input, [
                "Hola. Que bueno tenerte por aqui. Puedo ayudarte con productos, precios, stock, pedidos y domicilios.",
                "Hola, bienvenido. Si quieres, revisamos productos, precios o te acompano con tu pedido.",
                "Buenas. Estoy listo para ayudarte con tu compra y con cualquier duda sobre el catalogo.",
            ]),
        };
    }

    if (input.includes("como estas") || input.includes("como vas") || input.includes("que tal")) {
        return {
            reply: elegirVarianteChatbot(input, [
                "Voy muy bien, gracias. Dime que producto buscas y te cuento precio, stock y opciones de compra.",
                "Todo bien por aqui. Si quieres, empezamos por el producto que necesitas.",
            ]),
        };
    }

    if (input.includes("gracias")) {
        return {
            reply: elegirVarianteChatbot(input, [
                "Con mucho gusto. Si quieres seguir comprando, aqui sigo para ayudarte.",
                "Para eso estoy. Si necesitas otro producto o quieres revisar domicilio, me dices.",
            ]),
        };
    }

    if (input.includes("recomiend") || input.includes("oferta") || input.includes("ofertas") || input.includes("suger")) {
        const recomendados = catalogoProductos
            .filter((item) => item.disponible)
            .slice(0, 3)
            .map((item) => `${item.nombre} (${item.precio})`)
            .join(", ");

        return {
            reply: recomendados
                ? `Claro. Te puedo recomendar estas opciones del catalogo: ${recomendados}. Si alguno te interesa, escribeme su nombre y te doy precio, descripcion y stock exacto.`
                : "Puedo ayudarte a revisar el catalogo. Dime el nombre de un producto y te cuento precio, descripcion y stock.",
        };
    }

    if (producto && (pareceBusqueda || input.split(/\s+/).filter(Boolean).length <= 2)) {
        if (producto.stock > 0) {
            return {
                reply: elegirVarianteChatbot(`${input}-${producto.nombre}-${producto.stock}`, [
                    `Te encontre ${producto.nombre}. Su precio actual es ${producto.precio}. ${producto.descripcion}. En este momento tenemos ${producto.stock} unidades disponibles. Si quieres, te ayudo a realizar un pedido o a pedir domicilio.`,
                    `Claro, este es el producto ${producto.nombre}. Vale ${producto.precio} y ${producto.descripcion}. Ahora mismo contamos con ${producto.stock} unidades disponibles. Quieres que te lo deje listo para pedido o prefieres domicilio?`,
                    `Ya revise el catalogo y encontre ${producto.nombre}. Precio: ${producto.precio}. ${producto.descripcion}. En stock hay ${producto.stock} unidades disponibles. Deseas realizar el pedido o te lo gestiono con domicilio?`,
                ]),
                action: "show_product_options",
                search_term: producto.nombre,
                product_id: producto.id,
                options: [
                    { id: `add-${producto.id}`, label: "Agregar al carrito", kind: "add_to_cart", product_id: producto.id },
                    { id: `pickup-${producto.id}`, label: "Realizar pedido", kind: "quick_order", delivery_type: "pickup", product_id: producto.id },
                    { id: `delivery-${producto.id}`, label: "Pedir domicilio", kind: "quick_order", delivery_type: "delivery", product_id: producto.id },
                ],
                product_name: producto.nombre,
                price_display: producto.precio,
                product_stock: producto.stock,
                image_url: producto.imagen,
            };
        }

        return {
            reply: elegirVarianteChatbot(`${input}-${producto.nombre}-agotado`, [
                `Encontre ${producto.nombre}, pero ahora mismo esta agotado. Su ultimo precio registrado es ${producto.precio}. ${producto.descripcion}. Si quieres, te ayudo a buscar otra opcion parecida.`,
                `Si tenemos registrado ${producto.nombre}, aunque en este momento no hay unidades disponibles. Su precio es ${producto.precio} y ${producto.descripcion}. Puedo ayudarte a revisar otro producto.`,
            ]),
            action: "open_search",
            search_term: producto.nombre,
            product_id: producto.id,
            product_name: producto.nombre,
            price_display: producto.precio,
            product_stock: producto.stock,
            image_url: producto.imagen,
            options: [
                { id: "buscar", label: "Buscar otro producto" },
                { id: "ofertas", label: "Quiero ver ofertas" },
            ],
        };
    }

    if (input.includes("pedido") || input.includes("domicilio") || input.includes("envio")) {
        return {
            reply: elegirVarianteChatbot(input, [
                "Perfecto. Ya te abri el carrito para que continues con el pedido.",
                "Listo, te acompano con la compra. Ya te deje abierto el carrito para seguir.",
            ]),
            action: "open_cart",
        };
    }

    if (CHATBOT_WHATSAPP_RETRY_KEYWORDS.some((keyword) => input.includes(keyword))) {
        return {
            reply: elegirVarianteChatbot(input, [
                "Tienes razon, eso fue para retomar tu pedido, no para empezar de cero. Si el chat sigue activo con tu pedido, te reabro WhatsApp enseguida.",
                "Claro, en ese caso lo correcto es reabrir WhatsApp para que termines la confirmacion del pedido y puedas hablar con el dueño.",
                "Entendido. Si no se abrio WhatsApp, toca reenviarte el acceso del pedido para que puedas continuar la confirmacion.",
            ]),
        };
    }

    if (CHATBOT_OFF_TOPIC_KEYWORDS.some((keyword) => input.includes(keyword))) {
        return {
            reply: elegirVarianteChatbot(input, [
                "Jajaja, ese tema se sale un poco de lo mio. Yo aqui te acompano con la tienda. Si quieres, dime que producto necesitas y lo revisamos.",
                "De eso no soy el mejor para hablarte. Pero para compras si estoy fino: productos, precios, stock, pedidos o domicilios. Que te busco?",
                "Te seguiria la conversacion, pero aqui estoy mas concentrado en ayudarte con el supermercado. Si quieres, arrancamos con un producto o con tu pedido.",
                "Ese tema esta bueno, pero por aqui me encargo de la tienda. Dime si buscas algo del catalogo y te ayudo de una.",
            ]),
        };
    }

    return {
        reply: elegirVarianteChatbot(input, [
            "Si quieres, te ayudo con la compra. Dime el producto y te cuento precio, descripcion, stock y como pedirlo.",
            "Estoy pendiente para ayudarte con la tienda. Puedes decirme un producto, pedir recomendaciones o armar un pedido.",
            "Vamos paso a paso si quieres. Dime que necesitas comprar y yo te acompano con precios, stock, pedido o domicilio.",
            "Aqui te ayudo con lo del supermercado. Si ya sabes que necesitas, escribeme el nombre del producto y arrancamos.",
        ]),
    };
}

function ejecutarAccionChatbot(action, searchTerm = "", metadata = {}) {
    if (metadata.whatsapp_url && (action === "refresh_catalog" || action === "retry_whatsapp")) {
        abrirWhatsappPedido(metadata.whatsapp_url, true);
    }

    if (action === "open_search") {
        abrirBuscadorDesdeChat(searchTerm);
    }

    if (action === "open_cart") {
        toggleCarrito(true);
    }

        if (action === "refresh_catalog") {
            window.setTimeout(() => {
                window.location.reload();
            }, 1400);
        }
}

function responderDesdeChatbot(texto, action, searchTerm = "", options = [], metadata = {}) {
    window.setTimeout(() => {
        agregarMensajeChatbot(texto, "bot", metadata);
        chatbotActionOptions = Array.isArray(options) ? options : [];
        chatbotOpcionesVisibles = true;
        chatbotQuickMenuAbierto = false;
        renderizarOpcionesRapidasChatbot();
        ejecutarAccionChatbot(action, searchTerm, metadata);
    }, 450);
}

function responderConPayloadChatbot(payload = {}) {
    responderDesdeChatbot(
        payload.reply || "Estoy aqui para ayudarte con tu compra.",
        payload.action,
        payload.search_term || "",
        payload.options || [],
        payload
    );
}

async function solicitarRespuestaChatbot(mensaje) {
    const response = await fetch("/api/chatbot/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: mensaje }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "No pudimos responder desde el servidor.");
    }

    return payload;
}

async function solicitarPedidoRapido(productId, deliveryType) {
    const response = await fetch("/api/chatbot/quick-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            product_id: productId,
            delivery_type: deliveryType,
        }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "No pudimos registrar el pedido desde el chat.");
    }

    return payload;
}

async function solicitarPedidoCarritoChat(items, deliveryType, userMessage) {
    const response = await fetch("/api/chatbot/cart-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            items,
            delivery_type: deliveryType,
            user_message: userMessage,
        }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "No pudimos crear el pedido del carrito desde el chat.");
    }

    return payload;
}

async function agregarProductoDesdeChat(productId) {
    const producto = obtenerProductoCatalogoPorId(productId);

    if (!producto) {
        return {
            reply: "No pude encontrar ese producto en el catalogo actual. Si quieres, dime otro nombre y lo revisamos.",
            action: "open_search",
            options: [{ id: "buscar", label: "Buscar otro producto" }],
        };
    }

    if (!producto.disponible || producto.stock <= 0) {
        return {
            reply: `En este momento ${producto.nombre} no tiene unidades disponibles. Si quieres, te ayudo a buscar otra opcion parecida.`,
            action: "open_search",
            search_term: producto.nombre,
            options: [
                { id: "buscar", label: "Buscar otro producto" },
                { id: "ofertas", label: "Quiero ver ofertas" },
            ],
            ...crearMetadataProductoChat(producto),
        };
    }

    const agregado = agregarAlCarrito(
        Number.parseInt(producto.id || "0", 10),
        producto.nombre,
        producto.precioNumero,
        producto.imagen,
        producto.stock
    );

    if (!agregado) {
        return {
            reply: `Ya tienes en el carrito todas las unidades disponibles de ${producto.nombre}. Si quieres, puedo ayudarte con otro producto o dejar el pedido listo.`,
            action: "open_cart",
            options: construirOpcionesCarritoChatbot(),
            ...crearMetadataProductoChat(producto),
        };
    }

    return {
        reply: `Listo, ya agregue ${producto.nombre} al carrito. Si quieres, revisamos el carrito o te dejo el pedido listo de una vez.`,
        action: "open_cart",
        options: construirOpcionesCarritoChatbot(),
        ...crearMetadataProductoChat(producto),
    };
}

async function crearPedidoDesdeChat(deliveryType, userMessage) {
    if (carrito.length === 0) {
        return {
            reply: "Tu carrito esta vacio. Agrega un producto y yo te ayudo a crear el pedido o el domicilio.",
            action: "open_search",
            options: [{ id: "buscar", label: "Buscar producto" }],
        };
    }

    if (deliveryType === "delivery") {
        domicilioSeleccionado = true;
        actualizarCarrito();
    } else {
        domicilioSeleccionado = false;
        actualizarCarrito();
    }

    const payload = await solicitarPedidoCarritoChat(
        carrito.map((producto) => ({
            product_id: producto.productId,
            quantity: producto.cantidad,
        })),
        deliveryType,
        userMessage
    );

    vaciarCarrito(true);
    toggleCarrito(false);
    mostrarMensajeCarrito(
        `Pedido #${payload.order?.id || ""} creado ${deliveryType === "delivery" ? "con domicilio." : "para recoger en tienda."}`
    );
    return payload;
}

async function manejarOpcionRapidaChatbot(optionId) {
    const opcion =
        opcionesRapidasChatbot.find((item) => item.id === optionId)
        || {
            id: optionId,
            label: optionId === "ofertas" ? "Quiero ver ofertas" : "Quiero buscar producto",
        };

    if (!opcion) {
        return;
    }

    agregarMensajeChatbot(opcion.label, "user");
    chatbotOpcionesVisibles = false;
    chatbotQuickMenuAbierto = false;
    renderizarOpcionesRapidasChatbot();

    try {
        const respuesta = await solicitarRespuestaChatbot(opcion.label);
        responderConPayloadChatbot(respuesta);
    } catch (error) {
        responderDesdeChatbot(
            error.message || "El agente inteligente no pudo responder en este momento.",
            null,
            "",
            []
        );
    }
}

async function manejarAccionContextualChatbot(opcion) {
    const kind = opcion.dataset.chatbotKind || "message";
    const action = opcion.dataset.chatbotAction || "";
    const deliveryType = opcion.dataset.deliveryType || "pickup";
    const productId = opcion.dataset.productId || "";
    const label = opcion.textContent.trim();

    agregarMensajeChatbot(label, "user");
    chatbotOpcionesVisibles = false;
    chatbotActionOptions = [];
    chatbotQuickMenuAbierto = false;
    renderizarOpcionesRapidasChatbot();

    try {
        let respuesta = null;

        if (kind === "quick_order") {
            if (!productId) {
                throw new Error("No pude identificar el producto para crear el pedido.");
            }

            respuesta = await solicitarPedidoRapido(productId, deliveryType);
        } else if (kind === "add_to_cart") {
            if (!productId) {
                throw new Error("No pude identificar el producto para agregarlo al carrito.");
            }

            respuesta = await agregarProductoDesdeChat(productId);
        } else if (kind === "multi_order") {
            respuesta = await solicitarRespuestaChatbot(
                deliveryType === "delivery"
                    ? "Quiero pedir domicilio"
                    : "Quiero hacer pedido"
            );
        } else if (kind === "checkout") {
            respuesta = await crearPedidoDesdeChat(deliveryType, label);
        } else if (kind === "action") {
            respuesta = {
                reply: action === "open_cart"
                    ? "Listo, ya te abri el carrito para que revises tu compra."
                    : "Perfecto. Continuemos con tu compra.",
                action,
                options: action === "open_cart" ? construirOpcionesCarritoChatbot() : [],
            };
        } else {
            respuesta = await solicitarRespuestaChatbot(label);
        }

        responderConPayloadChatbot(respuesta);
    } catch (error) {
        responderDesdeChatbot(error.message || "No pudimos crear el pedido desde el chat.");
    }
}

async function enviarMensajeChatbot() {
    if (!chatbotInput) {
        return;
    }

    const mensaje = chatbotInput.value.trim();

    if (!mensaje) {
        return;
    }

    agregarMensajeChatbot(mensaje, "user");
    chatbotInput.value = "";
    chatbotOpcionesVisibles = false;
    chatbotActionOptions = [];
    chatbotQuickMenuAbierto = false;
    renderizarOpcionesRapidasChatbot();

    try {
        const respuesta = await solicitarRespuestaChatbot(mensaje);
        responderConPayloadChatbot(respuesta);
    } catch (error) {
        responderDesdeChatbot(
            error.message || "El agente inteligente no pudo responder en este momento.",
            null,
            "",
            []
        );
    }
}

function toggleChatbot(forzarEstado) {
    if (!chatbotPanel || !chatbotToggleBoton) {
        return;
    }

    const activar = typeof forzarEstado === "boolean"
        ? forzarEstado
        : !chatbotPanel.classList.contains("activo");

    chatbotPanel.classList.toggle("activo", activar);
    chatbotToggleBoton.classList.toggle("oculto", activar);
    chatbotToggleBoton.setAttribute("aria-expanded", activar ? "true" : "false");

    if (activar) {
        cerrarBusqueda();
        cerrarUsuario();
        toggleAccessibilityPanel(false);
        toggleQuickOptionsChatbot(false);

        if (chatbotInput) {
            chatbotInput.focus();
        }
    } else {
        detenerReconocimientoVoz();
        detenerAudioChatbot();
    }
}

function inicializarChatbot() {
    if (!chatbotPanel || !chatbotToggleBoton || !chatbotMessagesElemento || !chatbotQuickOptionsElemento) {
        return;
    }

    cargarSaludoInicialChatbot();
    cargarHistorialChatbot();
    cargarEstadoChatbot();

    chatbotToggleBoton.addEventListener("click", () => toggleChatbot(true));

    if (chatbotCloseBoton) {
        chatbotCloseBoton.addEventListener("click", () => toggleChatbot(false));
    }

    if (chatbotClearBoton) {
        chatbotClearBoton.addEventListener("click", manejarBorradoChatbot);
    }

    if (chatbotAudioToggleBoton) {
        chatbotAudioToggleBoton.addEventListener("click", alternarAudioChatbot);
    }

    if (chatbotQuickToggleBoton) {
        chatbotQuickToggleBoton.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleQuickOptionsChatbot();
        });
    }

    chatbotQuickOptionsElemento.addEventListener("click", (event) => {
        const boton = event.target.closest("[data-chatbot-option]");

        if (!boton) {
            return;
        }

        toggleQuickOptionsChatbot(false);

        const kind = boton.dataset.chatbotKind || "message";

        if (kind !== "message") {
            manejarAccionContextualChatbot(boton);
            return;
        }

        manejarOpcionRapidaChatbot(boton.dataset.chatbotOption || "");
    });

    if (chatbotForm) {
        chatbotForm.addEventListener("submit", (event) => {
            event.preventDefault();
            enviarMensajeChatbot();
        });
    }

    if (chatbotInput) {
        chatbotInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                enviarMensajeChatbot();
            }
        });

        chatbotInput.addEventListener("focus", () => toggleQuickOptionsChatbot(false));
    }

    if (chatbotMicBoton) {
        chatbotMicBoton.addEventListener("click", () => {
            if (chatbotEscuchando) {
                detenerReconocimientoVoz();
            } else {
                iniciarReconocimientoVoz();
            }
        });
    }

    actualizarBotonAudioChatbot();
}

function toggleCarrito(forzarEstado) {
    if (!carritoElemento) {
        return;
    }

    const activar = typeof forzarEstado === "boolean"
        ? forzarEstado
        : !carritoElemento.classList.contains("activo");

    carritoElemento.classList.toggle("activo", activar);

    if (carritoBackdrop) {
        carritoBackdrop.classList.toggle("activo", activar);
    }

    document.body.classList.toggle("drawer-open", activar);

    if (activar) {
        toggleAccessibilityPanel(false);
    }
}

function agregarAlCarrito(productId, nombre, precio, imagen, stockDisponible = Number.POSITIVE_INFINITY) {
    const producto = carrito.find((item) => item.productId === productId);
    const cantidadActual = producto ? producto.cantidad : 0;

    if (cantidadActual >= stockDisponible) {
        mostrarMensajeCarrito("Ya agregaste todas las unidades disponibles de ese producto.");
        toggleCarrito(true);
        return false;
    }

    if (producto) {
        producto.cantidad += 1;
        producto.stockDisponible = stockDisponible;
    } else {
        carrito.push({ productId, nombre, precio, imagen, cantidad: 1, stockDisponible });
    }

    actualizarCarrito();
    toggleCarrito(true);
    return true;
}

function renderizarEstadoVacio() {
    return `
        <div class="empty-cart-state">
            <div class="empty-cart-icon">M</div>
            <strong>Tu carrito esta vacio</strong>
            <p>Agrega productos para continuar con tu compra.</p>
        </div>
    `;
}

function renderizarItemCarrito(producto, index) {
    return `
        <article class="item-carrito">
            <div class="item-carrito-media">
                <img src="${producto.imagen}" alt="${producto.nombre}">
            </div>
            <div class="item-carrito-main">
                <div class="item-carrito-head">
                    <div>
                        <h4>${producto.nombre}</h4>
                        <p class="item-carrito-precio">${formatearPrecio(producto.precio)}</p>
                    </div>
                    <button type="button" class="eliminar" data-action="eliminar" data-index="${index}">Quitar</button>
                </div>
                <div class="cantidad">
                    <button type="button" data-action="restar" data-index="${index}">-</button>
                    <span>${producto.cantidad}</span>
                    <button type="button" data-action="sumar" data-index="${index}">+</button>
                </div>
            </div>
        </article>
    `;
}

function actualizarCarrito() {
    if (!itemsCarrito || !totalElemento || !contadorElemento || !tipoEntregaElemento || !mensajeCarritoElemento) {
        return;
    }

    if (carrito.length === 0) {
        itemsCarrito.innerHTML = renderizarEstadoVacio();
    } else {
        itemsCarrito.innerHTML = carrito
            .map((producto, index) => renderizarItemCarrito(producto, index))
            .join("");
    }

    const total = carrito.reduce((acumulado, producto) => acumulado + (producto.precio * producto.cantidad), 0);
    const totalItems = carrito.reduce((acumulado, producto) => acumulado + producto.cantidad, 0);

    totalElemento.textContent = `Total: ${formatearPrecio(total)}`;
    contadorElemento.textContent = totalItems;
    tipoEntregaElemento.textContent = domicilioSeleccionado ? "Entrega a domicilio" : "Entrega en tienda";

    if (totalItems === 0) {
        mensajeCarritoElemento.textContent = "Agrega productos para continuar con tu compra.";
    } else if (domicilioSeleccionado) {
        mensajeCarritoElemento.textContent = "Tu pedido sera enviado a domicilio.";
    } else {
        mensajeCarritoElemento.textContent = "Puedes hacer tu pedido o pedir domicilio.";
    }
}

function cambiarCantidad(index, cambio) {
    if (!carrito[index]) {
        return;
    }

    if (cambio > 0 && carrito[index].cantidad >= (carrito[index].stockDisponible || Number.POSITIVE_INFINITY)) {
        mostrarMensajeCarrito("Ya agregaste todas las unidades disponibles de ese producto.");
        return;
    }

    carrito[index].cantidad += cambio;

    if (carrito[index].cantidad <= 0) {
        carrito.splice(index, 1);
    }

    if (carrito.length === 0) {
        domicilioSeleccionado = false;
    }

    actualizarCarrito();
}

function eliminarProducto(index) {
    if (!carrito[index]) {
        return;
    }

    carrito.splice(index, 1);

    if (carrito.length === 0) {
        domicilioSeleccionado = false;
    }

    actualizarCarrito();
}

function vaciarCarrito(silent = false) {
    carrito.length = 0;
    domicilioSeleccionado = false;
    actualizarCarrito();

    if (!silent) {
        mostrarMensajeCarrito("Tu carrito quedo vacio.");
    }
}

function abrirWhatsappPedido(url, desdeChatbot = false) {
    if (!url) {
        return;
    }

    const esMovil = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(navigator.userAgent || "");

    if (esMovil) {
        const nuevaVentana = window.open(url, "_blank");

        if (!nuevaVentana) {
            const mensaje = "No pude abrir WhatsApp desde el telefono. Revisa si tu navegador bloqueo la apertura o si tienes WhatsApp instalado.";

            if (desdeChatbot) {
                responderDesdeChatbot(
                    mensaje,
                    null,
                    "",
                    [
                        {
                            id: "retry-whatsapp",
                            label: "Abrir WhatsApp",
                            kind: "action",
                            action: "retry_whatsapp",
                        }
                    ],
                    { whatsapp_url: url }
                );
                return;
            }

            mostrarMensajeCarrito(mensaje);
            return;
        }

        return;
    }

    const popup = window.open(
        url,
        "mercaapp_whatsapp_popup",
        "popup=yes,width=980,height=760,noopener,noreferrer"
    );

    if (!popup) {
        const mensaje = "No pude abrir WhatsApp en una ventana nueva. Revisa si tu navegador bloqueo la ventana emergente y vuelve a intentarlo.";

        if (desdeChatbot) {
            responderDesdeChatbot(
                mensaje,
                null,
                "",
                [
                    {
                        id: "retry-whatsapp",
                        label: "Reabrir WhatsApp",
                        kind: "action",
                        action: "retry_whatsapp",
                    }
                ],
                { whatsapp_url: url }
            );
            return;
        }

        mostrarMensajeCarrito(mensaje);
        return;
    }

    popup.focus();
}

async function procesarPedidoCarrito(deliveryType) {
    if (carrito.length === 0) {
        mostrarMensajeCarrito(
            deliveryType === "delivery"
                ? "Agrega productos antes de pedir domicilio."
                : "Tu carrito esta vacio. Agrega productos para hacer el pedido."
        );
        return;
    }

    domicilioSeleccionado = deliveryType === "delivery";
    actualizarCarrito();

    if (hacerPedidoBoton) {
        hacerPedidoBoton.disabled = true;
        hacerPedidoBoton.textContent = "Procesando...";
    }

    if (pedirDomicilioBoton) {
        pedirDomicilioBoton.disabled = true;
        pedirDomicilioBoton.textContent = "Procesando...";
    }

    try {
        const response = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                delivery_type: deliveryType,
                items: carrito.map((producto) => ({
                    product_id: producto.productId,
                    quantity: producto.cantidad,
                })),
            }),
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload.ok) {
            throw new Error(payload.error || "No pudimos registrar el pedido.");
        }

        abrirWhatsappPedido(payload.whatsapp_url);
        vaciarCarrito();
        toggleCarrito(false);
        mostrarMensajeCarrito(
            `Pedido #${payload.order.id} creado por ${payload.order.total_mostrado} ${payload.order.delivery_type === "delivery" ? "con domicilio." : "para recoger en tienda."}`
        );
        window.setTimeout(() => {
            window.location.reload();
        }, 1200);
    } catch (error) {
        mostrarMensajeCarrito(error.message || "No pudimos registrar tu pedido.");
    } finally {
        if (hacerPedidoBoton) {
            hacerPedidoBoton.disabled = false;
            hacerPedidoBoton.textContent = "Hacer pedido";
        }

        if (pedirDomicilioBoton) {
            pedirDomicilioBoton.disabled = false;
            pedirDomicilioBoton.textContent = "Pedir domicilio";
        }
    }
}

function pedirDomicilio() {
    procesarPedidoCarrito("delivery");
}

async function hacerPedido() {
    await procesarPedidoCarrito("pickup");
}

function mostrarMensajeCarrito(mensaje) {
    if (mensajeCarritoElemento) {
        mensajeCarritoElemento.textContent = mensaje;
    }
}

function manejarAccionCarrito(event) {
    const boton = event.target.closest("button[data-action]");

    if (!boton) {
        return;
    }

    const index = Number.parseInt(boton.dataset.index || "-1", 10);

    if (Number.isNaN(index) || index < 0) {
        return;
    }

    if (boton.dataset.action === "restar") {
        cambiarCantidad(index, -1);
    }

    if (boton.dataset.action === "sumar") {
        cambiarCantidad(index, 1);
    }

    if (boton.dataset.action === "eliminar") {
        eliminarProducto(index);
    }
}

function cerrarBusqueda() {
    if (busquedaPanel) {
        busquedaPanel.classList.remove("activo");
    }
}

function cerrarUsuario() {
    if (usuarioPanel) {
        usuarioPanel.classList.remove("activo");
    }
}

function toggleBusqueda() {
    if (!busquedaPanel) {
        return;
    }

    const activar = !busquedaPanel.classList.contains("activo");
    cerrarUsuario();
    busquedaPanel.classList.toggle("activo", activar);

    if (activar && busquedaInput) {
        busquedaInput.focus();
    }
}

function toggleUsuario() {
    if (!usuarioPanel) {
        return;
    }

    const activar = !usuarioPanel.classList.contains("activo");
    cerrarBusqueda();
    usuarioPanel.classList.toggle("activo", activar);
}

function actualizarCategoriaActiva() {
    menuBotones.forEach((boton) => {
        boton.classList.toggle("activo", boton.dataset.categoria === categoriaActual);
    });

    if (heroSection) {
        heroSection.classList.toggle("oculto", categoriaActual !== "inicio");
    }
}

function productoPerteneceACategoria(card) {
    const categoriaProducto = card.dataset.categoria || "";
    const esOferta = card.dataset.oferta === "true";

    if (categoriaActual === "inicio") {
        return true;
    }

    if (categoriaActual === "ofertas") {
        return esOferta;
    }

    return categoriaProducto === categoriaActual;
}

function cambiarCategoria(nuevaCategoria) {
    categoriaActual = nuevaCategoria;
    actualizarCategoriaActiva();
    filtrarProductos();
}

function filtrarProductos() {
    const termino = normalizarTexto(busquedaInput ? busquedaInput.value : "");
    let visibles = 0;

    productosCards.forEach((card) => {
        const nombreProducto = normalizarTexto(card.dataset.producto || "");
        const coincideBusqueda = termino === "" || nombreProducto.includes(termino);
        const coincideCategoria = productoPerteneceACategoria(card);
        const coincide = coincideBusqueda && coincideCategoria;

        card.classList.toggle("oculta", !coincide);

        if (coincide) {
            visibles += 1;
        }
    });

    if (!mensajeBusquedaElemento) {
        return;
    }

    if (termino !== "" && visibles === 0) {
        mensajeBusquedaElemento.textContent = "No encontramos productos con ese nombre.";
        mensajeBusquedaElemento.classList.remove("oculto");
    } else if (termino === "" && visibles === 0) {
        mensajeBusquedaElemento.textContent = categoriaActual === "ofertas"
            ? "No hay ofertas disponibles en este momento."
            : "No hay productos en esta categoria.";
        mensajeBusquedaElemento.classList.remove("oculto");
    } else {
        mensajeBusquedaElemento.classList.add("oculto");
    }
}

async function completarInfoUsuario() {
    let usuario = obtenerUsuarioGuardado();

    try {
        usuario = await cargarUsuarioDesdeBackend();
    } catch (error) {
        if (!usuario) {
            usuario = {
                nombre: "Cliente MercaApp",
                username: "cliente",
                correo: "Sin correo registrado",
                telefono: "No registrado",
                direccion: "Pendiente por definir",
                estado: "Activo",
                ultimoAcceso: "Hoy",
            };
        }
    }

    const nombre = usuario?.nombre || "Cliente MercaApp";
    const username = usuario?.username || normalizarTexto(nombre).replace(/\s+/g, ".") || "cliente";
    const correo = usuario?.correo || "Sin correo registrado";
    const telefono = usuario?.telefono || "No registrado";
    const estado = usuario?.estado || "Activo";
    const direccion = usuario?.direccion || "Pendiente por definir";
    const ultimoAcceso = usuario?.ultimoAcceso || "Hoy";
    const inicial = nombre.charAt(0).toUpperCase() || "M";

    if (usuarioNombreElemento) {
        usuarioNombreElemento.textContent = nombre;
    }

    if (usuarioHandleElemento) {
        usuarioHandleElemento.textContent = `@${username}`;
    }

    if (usuarioCorreoElemento) {
        usuarioCorreoElemento.textContent = correo;
    }

    if (usuarioTelefonoElemento) {
        usuarioTelefonoElemento.textContent = telefono;
    }

    if (usuarioEstadoElemento) {
        usuarioEstadoElemento.textContent = estado;
    }

    if (usuarioDireccionElemento) {
        usuarioDireccionElemento.textContent = direccion;
    }

    if (usuarioAccesoElemento) {
        usuarioAccesoElemento.textContent = ultimoAcceso;
    }

    if (usuarioInicialElemento) {
        usuarioInicialElemento.textContent = inicial;
    }
}

function manejarClickExterior(event) {
    if (busquedaPanel && !event.target.closest(".busqueda-wrapper")) {
        cerrarBusqueda();
    }

    if (usuarioPanel && !event.target.closest(".usuario-wrapper")) {
        cerrarUsuario();
    }

    if (accessibilityPanel && !event.target.closest(".accessibility-shell")) {
        toggleAccessibilityPanel(false);
    }

    if (chatbotQuickOptionsElemento && !event.target.closest(".chatbot-quick-menu")) {
        toggleQuickOptionsChatbot(false);
    }
}

function manejarEscape(event) {
    if (event.key !== "Escape") {
        return;
    }

    cerrarBusqueda();
    cerrarUsuario();
    toggleCarrito(false);
    toggleChatbot(false);
    toggleAccessibilityPanel(false);
}

function inicializarTienda() {
    menuBotones.forEach((boton) => {
        boton.addEventListener("click", () => {
            cambiarCategoria(boton.dataset.categoria || "inicio");
        });
    });

    document.querySelectorAll(".agregar-producto").forEach((boton) => {
        boton.addEventListener("click", () => {
            const productId = Number.parseInt(boton.dataset.id || "0", 10);
            const nombre = boton.dataset.nombre || "";
            const precio = Number.parseInt(boton.dataset.precio || "0", 10);
            const imagen = boton.dataset.imagen || "";
            const stock = Number.parseInt(boton.dataset.stock || "0", 10);
            agregarAlCarrito(productId, nombre, precio, imagen, stock);
        });
    });

    if (toggleCarritoBoton) {
        toggleCarritoBoton.addEventListener("click", () => toggleCarrito());
    }

    if (cerrarCarritoBoton) {
        cerrarCarritoBoton.addEventListener("click", () => toggleCarrito(false));
    }

    if (carritoBackdrop) {
        carritoBackdrop.addEventListener("click", () => toggleCarrito(false));
    }

    if (itemsCarrito) {
        itemsCarrito.addEventListener("click", manejarAccionCarrito);
    }

    if (pedirDomicilioBoton) {
        pedirDomicilioBoton.addEventListener("click", pedirDomicilio);
    }

    if (hacerPedidoBoton) {
        hacerPedidoBoton.addEventListener("click", hacerPedido);
    }

    if (vaciarCarritoBoton) {
        vaciarCarritoBoton.addEventListener("click", vaciarCarrito);
    }

    if (toggleBusquedaBoton) {
        toggleBusquedaBoton.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleBusqueda();
        });
    }

    if (busquedaInput) {
        busquedaInput.addEventListener("input", filtrarProductos);
        busquedaInput.addEventListener("click", (event) => event.stopPropagation());
    }

    if (toggleUsuarioBoton) {
        toggleUsuarioBoton.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleUsuario();
        });
    }

    if (usuarioPanel) {
        usuarioPanel.addEventListener("click", (event) => event.stopPropagation());
    }

    document.addEventListener("click", manejarClickExterior);
    document.addEventListener("keydown", manejarEscape);

    completarInfoUsuario();
    actualizarCategoriaActiva();
    filtrarProductos();
    actualizarCarrito();
    inicializarAccesibilidad();
    inicializarChatbot();
}

document.addEventListener("DOMContentLoaded", inicializarTienda);
