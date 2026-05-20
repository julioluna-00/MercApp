function generarCorreo(nombre) {
    const base = (nombre || "cliente")
        .toLowerCase()
        .replace(/\s+/g, ".")
        .replace(/[^a-z0-9.]/g, "");

    return `${base || "cliente"}@mercaapp.com`;
}

function obtenerValor(formulario, nombreCampo) {
    const input = formulario.querySelector(`[name="${nombreCampo}"]`);
    return input ? input.value.trim() : "";
}

function obtenerUsuarioGuardado() {
    try {
        const usuarioGuardado = localStorage.getItem("mercaappUsuario");
        return usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
    } catch (error) {
        return null;
    }
}

function guardarUsuarioFront() {
    const formulario = document.querySelector(".auth-form");

    if (!formulario) {
        return;
    }

    formulario.addEventListener("submit", () => {
        const usuarioPrevio = obtenerUsuarioGuardado();
        const username = obtenerValor(formulario, "username");
        const firstName = obtenerValor(formulario, "first_name");
        const lastName = obtenerValor(formulario, "last_name");
        const telefono = obtenerValor(formulario, "phone");
        const direccion = obtenerValor(formulario, "address");
        const nombre = [firstName, lastName].filter(Boolean).join(" ") || usuarioPrevio?.nombre || username;

        if (!username) {
            return;
        }

        const usuario = {
            nombre: nombre || username,
            username,
            correo: generarCorreo(username || nombre),
            estado: "Activo",
            direccion: direccion || usuarioPrevio?.direccion || "Pendiente por definir",
            telefono: telefono || usuarioPrevio?.telefono || "No registrado",
            ultimoAcceso: new Date().toLocaleString("es-CO"),
            firstName: firstName || usuarioPrevio?.firstName || username,
            lastName: lastName || usuarioPrevio?.lastName || "",
            isAdmin: username === "admin",
        };

        localStorage.setItem("mercaappUsuario", JSON.stringify(usuario));
    });
}

document.addEventListener("DOMContentLoaded", guardarUsuarioFront);
