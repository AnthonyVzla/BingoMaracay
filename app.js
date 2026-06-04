// 1. Inicializar Supabase
const supabaseUrl = 'https://eantmjtpaynxbpynjsby.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhbnRtanRwYXlueGJweW5qc2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NzQzNTMsImV4cCI6MjA5NjE1MDM1M30.KVwZwT89vOn9OwC5LPHdXYbRUS0RiSOTkWqpzasydGQ';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let usuarioActual = null;
let juegoActualId = null;

// Funciones de UI
function mostrarPanel(idPanel) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(idPanel).classList.add('active');
}

// 2. Autenticación y Registro
async function registrarUsuario() {
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;
    const perfil = {
        nombre: document.getElementById('reg-nombre').value,
        apellido: document.getElementById('reg-apellido').value,
        edad: document.getElementById('reg-edad').value,
        cedula: document.getElementById('reg-cedula').value,
        telefono: document.getElementById('reg-tel').value,
        nacionalidad: document.getElementById('reg-nac').value,
        pago_cedula: document.getElementById('reg-pm-cedula').value,
        pago_telefono: document.getElementById('reg-pm-tel').value,
        pago_banco: document.getElementById('reg-pm-banco').value
    };

    // Crear usuario en Auth
    const { data, error } = await supabase.auth.signUp({ email, password });
    
    if (error) return alert("Error: " + error.message);

    // Guardar datos extras en tabla perfiles
    if (data.user) {
        await supabase.from('perfiles').insert([{ id: data.user.id, ...perfil }]);
        alert("Registro exitoso. Inicia sesión.");
    }
}

async function iniciarSesion() {
    const email = document.getElementById('log-email').value;
    const password = document.getElementById('log-pass').value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert("Error: " + error.message);

    usuarioActual = data.user;
    cargarDashboard();
}

// 3. Dashboard del Jugador
async function cargarDashboard() {
    mostrarPanel('panel-dashboard');
    // Suscribirse a cambios del juego en tiempo real (Supabase Realtime)
    supabase.channel('juegos')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'juegos' }, payload => {
            actualizarUIJuego(payload.new);
        }).subscribe();
}

// Lógica de compra de cartones
async function reportarPago() {
    const cantidad = document.getElementById('cantidad-cartones').value;
    
    // Generar matrices y números aleatorios de identificación
    let cartones = [];
    for(let i = 0; i < cantidad; i++) {
        cartones.push({
            id_usuario: usuarioActual.id,
            numero_identificacion: Math.floor(Math.random() * 1000) + 1, // ID aleatorio
            estado_pago: 'pendiente'
            // matriz: generarMatrizBingo() -> Función a crear para generar los 24 números
        });
    }

    await supabase.from('cartones').insert(cartones);
    document.getElementById('estado-compra').innerText = "Pago reportado. Esperando aprobación de soporte...";
}

// 4. Funciones Ocultas: Panel de Soporte y Master
async function pedirCodigoAdmin() {
    const codigo = prompt("Ingrese código de acceso de soporte:");
    if (!codigo) return;

    // Verificar en base de datos si el código existe
    const { data, error } = await supabase.from('codigos_acceso').select('*').eq('codigo', codigo).single();

    if (data) {
        mostrarPanel('panel-admin');
        if (codigo === '27146006') {
            // Habilitar funciones exclusivas del MASTER
            document.getElementById('panel-master').style.display = 'block';
        }
        cargarPanelAdmin();
    } else {
        alert("Código inválido");
    }
}

// 5. Motor del Juego (Tablero y Cilindro)
function renderizarTablero75() {
    const tablero = document.getElementById('tablero-75');
    tablero.innerHTML = '';
    for(let i = 1; i <= 75; i++) {
        const div = document.createElement('div');
        div.className = 'num-box';
        div.id = `num-${i}`;
        div.innerText = i;
        tablero.appendChild(div);
    }
}

// Función que se activa cuando el usuario presiona "¡BINGO!"
async function cantarBingo() {
    // 1. Pausar el juego cambiando el estado en la base de datos
    await supabase.from('juegos').update({ estado: 'pausado' }).eq('id', juegoActualId);
    
    // 2. Enviar alerta a soporte
    await supabase.from('reclamos_bingo').insert([{ id_usuario: usuarioActual.id, id_juego: juegoActualId }]);
    
    alert("¡BINGO CANTADO! El juego se ha pausado mientras el equipo de soporte verifica tu cartón.");
}

// 6. Funciones del Admin/Soporte
async function aprobarBingo(idReclamo, idUsuario) {
    // Obtener los datos del usuario ganador
    const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', idUsuario).single();
    
    // Mostrar datos de PagoMóvil
    document.getElementById('datos-ganador-confirmado').style.display = 'block';
    document.getElementById('info-pago-ganador').innerHTML = `
        <p><strong>Nombre:</strong> ${perfil.nombre} ${perfil.apellido}</p>
        <p><strong>Cédula:</strong> ${perfil.pago_cedula}</p>
        <p><strong>Teléfono:</strong> ${perfil.pago_telefono}</p>
        <p><strong>Banco:</strong> ${perfil.pago_banco}</p>
    `;

    // Lógica para revisar si la prórroga está activa
    // Si no está activa, redirigir a todos a sala de espera.
}

async function crearCodigo() {
    // Exclusivo del código 27146006
    const nuevoCodigo = document.getElementById('nuevo-codigo').value;
    await supabase.from('codigos_acceso').insert([{ codigo: nuevoCodigo, creado_por: '27146006' }]);
    alert("Código de soporte creado exitosamente.");
}

// Inicialización de UI
renderizarTablero75();
