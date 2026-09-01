
    lucide.createIcons();
    // --- REGISTRO DEL SERVICE WORKER PARA PWA ---
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(registro => {
            console.log('¡ServiceWorker registrado exitosamente!', registro.scope);
          })
          .catch(error => {
            console.log('Error registrando el ServiceWorker:', error);
          });
      });
    }
    const API_URL = 'https://MatiasArbeleche.pythonanywhere.com';

    document.addEventListener('DOMContentLoaded', () => {
      const usuarioGuardado = localStorage.getItem('usuario');
      
      if (usuarioGuardado) {
        // Si hay un usuario guardado, lo leemos
        const usuarioData = JSON.parse(usuarioGuardado);
        
        // Actualizamos los textos de la interfaz
        document.getElementById('home-greeting').innerText = `Hola, ${usuarioData.nombre.split(' ')[0]} 👋`;
        document.getElementById('account-name').innerText = usuarioData.nombre;
        
        // Lo mandamos al inicio y cargamos sus cosas
        switchScreen('screen-home');
        loadLugares();
      }
    });

    // --- NAVEGACIÓN ---
    function switchScreen(screenId) {
      document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
      const newScreen = document.getElementById(screenId);
      if (newScreen) { newScreen.classList.add('active'); newScreen.scrollTo(0, 0); }

      const nav = document.getElementById('main-nav');
      if (['screen-login', 'screen-add', 'screen-register', 'screen-add-space', 'screen-family-profile'].includes(screenId)) {
        nav.style.display = 'none';
      } else { 
        nav.style.display = 'flex'; 
      }

      document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
      
      if (['screen-home', 'screen-storage'].includes(screenId)) {
        document.getElementById('nav-home')?.classList.add('active');
      } else if (screenId === 'screen-recipes') {
        document.getElementById('nav-recipes')?.classList.add('active');
        cargarFiltrosChat(); 
      } else if (screenId === 'screen-account') {
        document.getElementById('nav-account')?.classList.add('active');
      } else if (screenId === 'screen-family-profile') {
        loadProfile(); // Ejecuta la carga de datos al abrir la pantalla
      }

      lucide.createIcons();
    }

    function abrirLugar(nombreLugar) {
      document.getElementById('storage-title').innerText = nombreLugar;
      loadAlimentos(nombreLugar);
      switchScreen('screen-storage');
    }

    // --- DASHBOARD (INICIO) ---
    async function updateDashboardStats() {
      const usuarioData = JSON.parse(localStorage.getItem('usuario'));
      if (!usuarioData) return;
      try {
        const respuesta = await fetch(`${API_URL}/alimentos?usuario_id=${usuarioData.id}`);
        const data = await respuesta.json();
        if (respuesta.ok) {
          const totalAlimentos = data.alimentos.length;
          let vencenPronto = 0;
          const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
          data.alimentos.forEach(alim => {
            const fechaVenc = new Date(alim.fecha_vencimiento + 'T00:00:00'); 
            const difDias = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
            if (difDias <= 3) vencenPronto++;
          });
          document.getElementById('dash-total-alimentos').innerText = totalAlimentos;
          document.getElementById('dash-vencen-pronto').innerText = vencenPronto;
        }
      } catch (error) { console.error("Error estadísticas:", error); }
    }

    // Variable global para controlar la instancia del gráfico
let miGraficoStats = null; 

async function renderGraficos() {
  const usuarioData = JSON.parse(localStorage.getItem('usuario'));
  if (!usuarioData) return;

  try {
    const respuesta = await fetch(`${API_URL}/estadisticas?usuario_id=${usuarioData.id}`);
    
    if (respuesta.ok) {
      const data = await respuesta.json();
      const consumidos = data.estadisticas.consumidos;
      const desperdiciados = data.estadisticas.desperdiciados;

      const ctx = document.getElementById('statsChart').getContext('2d');

      // 1. Destruimos el gráfico anterior si existe (evita bugs visuales)
      if (miGraficoStats) {
        miGraficoStats.destroy();
      }

      // 2. Comprobamos si hay datos reales
      const hayDatos = consumidos > 0 || desperdiciados > 0;

      // 3. Configuramos y creamos el nuevo gráfico
      miGraficoStats = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Aprovechados', 'Desperdiciados'],
          datasets: [{
            // Si no hay datos, le pasamos un "1" fantasma para que dibuje un círculo gris entero
            data: hayDatos ? [consumidos, desperdiciados] : [1, 0], 
            backgroundColor: hayDatos
              ? ['#10b981', '#ef4444'] // Verde (Primary) y Rojo (Danger) de tu paleta
              : ['#e2e8f0', '#ffffff'], // Grises para estado vacío
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false, // Permite que se adapte al div padre
          cutout: '75%', // Hace que el anillo sea más finito y elegante
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                usePointStyle: true, // Bolitas en lugar de cuadrados en la leyenda
                padding: 20,
                font: {
                  family: "'Outfit', sans-serif",
                  size: 13
                }
              }
            },
            tooltip: {
              // Apagamos los tooltips si es el círculo gris fantasma
              enabled: hayDatos 
            }
          }
        }
      });
    }
  } catch (error) {
    console.error("Error cargando gráficos:", error);
  }
}   

    // --- CARGAR ESPACIOS ---
    async function loadLugares() {
      const usuarioData = JSON.parse(localStorage.getItem('usuario'));
      if (!usuarioData) return;
      try {
        const respuesta = await fetch(`${API_URL}/lugares?usuario_id=${usuarioData.id}`);
        const data = await respuesta.json();
        if (respuesta.ok) {
          const listContainer = document.getElementById('home-lugares-list');
          const selectUbicacion = document.getElementById('add-ubicacion');
          listContainer.innerHTML = ''; selectUbicacion.innerHTML = '<option value="">Seleccionar ubicación...</option>';
          if (data.lugares.length === 0) {
            listContainer.innerHTML = '<p style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">No tenés espacios creados. ¡Agregá uno para empezar!</p>';
            return;
          }
          data.lugares.forEach(lugar => {
            let emoji = lugar.tipo === 'Heladera' ? '🧊' : (lugar.tipo === 'Freezer' ? '❄️' : '🥫');
            listContainer.innerHTML += `
              <div class="list-item" onclick="abrirLugar('${lugar.nombre}')">
                <div class="emoji-icon">${emoji}</div>
                <div class="item-text"><h4>${lugar.nombre}</h4><p>${lugar.tipo === 'Otro' ? lugar.subtipo : lugar.tipo}</p></div>
                <i data-lucide="chevron-right" color="#cbd5e1"></i>
              </div>
            `;
            selectUbicacion.innerHTML += `<option value="${lugar.nombre}">${lugar.nombre}</option>`;
          });
          lucide.createIcons();
        }
        updateDashboardStats();
        renderGraficos();
      } catch (error) { console.error("Error lugares:", error); }
    }

    // --- CARGAR ALIMENTOS (CON SEMÁFORO) ---
    async function loadAlimentos(nombreLugar) {
      const usuarioData = JSON.parse(localStorage.getItem('usuario'));
      if (!usuarioData) return;
      try {
        const respuesta = await fetch(`${API_URL}/alimentos?usuario_id=${usuarioData.id}&lugar=${nombreLugar}`);
        const data = await respuesta.json();
        const listContainer = document.getElementById('storage-alimentos-list');
        listContainer.innerHTML = '';
        if (data.alimentos.length === 0) {
          listContainer.innerHTML = '<p style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">No hay alimentos acá todavía.</p>';
          return;
        }
        data.alimentos.forEach(alim => {
          let emoji = '📦';
          if(alim.categoria.includes('Lácteos')) emoji = '🥛';
          if(alim.categoria.includes('Carnes')) emoji = '🥩';
          if(alim.categoria.includes('Verduras')) emoji = '🥗';
          if(alim.categoria.includes('Frutas')) emoji = '🍎';
          if(alim.categoria.includes('Bebidas')) emoji = '🥤';
          if(alim.categoria.includes('Despensa')) emoji = '🍝';
          if(alim.categoria.includes('Dulces')) emoji = '🍫';

          let textoDetalle = '';
          if (alim.marca) textoDetalle += `${alim.marca} • `;
          textoDetalle += `${alim.cantidad} ${alim.unidad}`;
          if (alim.estado_fisico) textoDetalle += ` • ${alim.estado_fisico}`;

          const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
          const fechaVenc = new Date(alim.fecha_vencimiento + 'T00:00:00');
          const difDias = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

          let badgeColor = ''; let badgeText = '';
          if (difDias < 0) { badgeColor = 'background: #1e293b; color: #f8fafc;'; badgeText = '¡Vencido!'; }
          else if (difDias <= 1) { badgeColor = 'background: #fee2e2; color: #ef4444;'; badgeText = difDias === 0 ? 'Vence hoy' : 'Vence mañana'; }
          else if (difDias <= 3) { badgeColor = 'background: #ffedd5; color: #f97316;'; badgeText = `Vence en ${difDias} días`; }
          else { badgeColor = 'background: var(--primary-light); color: var(--primary-dark);'; badgeText = 'En fecha'; }

          listContainer.innerHTML += `
                      <div class="list-item">
                        <div class="emoji-icon">${emoji}</div>
                        <div class="item-text"><h4 style="text-transform: capitalize;">${alim.nombre}</h4><p>${textoDetalle}</p></div>
                        <span class="badge" style="${badgeColor}">${badgeText}</span>
                        
                        <!-- NUEVO BOTÓN DE BORRAR -->
                        <button onclick="event.stopPropagation(); borrarAlimento(${alim.id}, '${nombreLugar}')" style="background: none; border: none; padding: 8px; cursor: pointer; color: var(--danger); margin-left: 8px; transition: transform 0.2s;">
                          <i data-lucide="trash-2"></i>
                        </button>
                      </div>
                    `;
        });
        lucide.createIcons();
      } catch (error) { console.error("Error alimentos:", error); }
    }

    // --- FORMULARIOS ---
    async function handleLogin(event) {
      event.preventDefault();
      const identificador = document.getElementById('login-identificador').value;
      const password = document.getElementById('login-password').value;
      const errorDiv = document.getElementById('login-error'); errorDiv.innerHTML = ""; 
      try {
        const respuesta = await fetch(`${API_URL}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identificador, password }) });
        const data = await respuesta.json();
        if (respuesta.ok) {
          localStorage.setItem('usuario', JSON.stringify(data.usuario));
          document.getElementById('home-greeting').innerText = `Hola, ${data.usuario.nombre.split(' ')[0]} 👋`;
          document.getElementById('account-name').innerText = data.usuario.nombre;
          switchScreen('screen-home'); loadLugares();
        } else { errorDiv.innerHTML = `<p style="color: var(--danger); font-size: 0.85rem; margin-top: 5px;">*${data.mensaje}*</p>`; }
      } catch (error) { errorDiv.innerHTML = `<p style="color: var(--danger); font-size: 0.85rem; margin-top: 5px;">*Error de conexión*</p>`; }
    }

    async function handleRegister(event) {
      event.preventDefault();
      const email = document.getElementById('reg-email').value;
      const nombre = document.getElementById('reg-nombre').value;
      const username = document.getElementById('reg-username').value;
      const password = document.getElementById('reg-password').value;
      const confirmPassword = document.getElementById('reg-confirm-password').value;
      const errorDiv = document.getElementById('register-error'); errorDiv.innerHTML = "";
      if (password !== confirmPassword) { errorDiv.innerHTML = `<p style="color: var(--danger); font-size: 0.85rem; margin-top: 5px;">*Las contraseñas no coinciden*</p>`; return; }
      try {
        const respuesta = await fetch(`${API_URL}/registro`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, nombre_completo: nombre, username, password }) });
        const data = await respuesta.json();
        if (respuesta.ok) { mostrarNotificacion("¡Cuenta creada!", "success"); switchScreen('screen-login'); }
        else { errorDiv.innerHTML = `<p style="color: var(--danger); font-size: 0.85rem; margin-top: 5px;">*${data.mensaje}*</p>`; }
      } catch (error) { errorDiv.innerHTML = `<p style="color: var(--danger); font-size: 0.85rem; margin-top: 5px;">*Error de conexión*</p>`; }
    }

    async function handleAddSpace(event) {
      event.preventDefault();
      const nombre = document.getElementById('space-nombre').value;
      const tipo = document.getElementById('space-tipo').value;
      const subtipo = document.getElementById('space-subtipo').value;
      const usuarioData = JSON.parse(localStorage.getItem('usuario'));
      try {
        const respuesta = await fetch(`${API_URL}/lugares`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario_id: usuarioData.id, nombre, tipo, subtipo }) });
        if (respuesta.ok) { mostrarNotificacion("¡Espacio creado!", "success"); event.target.reset(); document.getElementById('group-subtipo').style.display = 'none'; switchScreen('screen-home'); loadLugares(); }
        else { const data = await respuesta.json(); mostrarNotificacion("Error: " + data.mensaje, "error"); }
      } catch (error) { console.error(error); }
    }

    function toggleEstadoFisico(categoria) {
      const grupo = document.getElementById('group-estado-fisico'); const select = document.getElementById('add-estado-fisico');
      if (categoria === 'Carnes') { grupo.style.display = 'flex'; select.setAttribute('required', 'true'); }
      else { grupo.style.display = 'none'; select.removeAttribute('required'); select.value = ''; }
    }

    function calcularVencimientoCarne() {
      const categoria = document.getElementById('add-categoria').value;
      const estadoFisico = document.getElementById('add-estado-fisico').value;
      const ubicacion = document.getElementById('add-ubicacion').value;
      const inputFecha = document.getElementById('add-fecha');
      if (categoria.includes('Carnes') && estadoFisico && ubicacion) {
        let diasASumar = 0; const esFreezer = ubicacion.toLowerCase().includes('freezer');
        if (esFreezer) {
          if (estadoFisico.includes('Picada')) diasASumar = 120;
          else if (estadoFisico.includes('Pieza Entera')) diasASumar = 240;
          else if (estadoFisico.includes('Trozado')) diasASumar = 180;
          else if (estadoFisico.includes('Filet')) diasASumar = 90;
        } else {
          if (estadoFisico.includes('Picada')) diasASumar = 2;
          else if (estadoFisico.includes('Pieza Entera')) diasASumar = 5;
          else if (estadoFisico.includes('Trozado')) diasASumar = 2;
          else if (estadoFisico.includes('Filet')) diasASumar = 2;
        }
        if (diasASumar > 0) {
          const fechaCalculada = new Date(); fechaCalculada.setDate(fechaCalculada.getDate() + diasASumar);
          inputFecha.value = `${fechaCalculada.getFullYear()}-${String(fechaCalculada.getMonth() + 1).padStart(2, '0')}-${String(fechaCalculada.getDate()).padStart(2, '0')}`;
          inputFecha.style.borderColor = 'var(--primary)'; inputFecha.style.backgroundColor = 'var(--primary-light)';
          setTimeout(() => { inputFecha.style.borderColor = 'var(--border-color)'; inputFecha.style.backgroundColor = 'var(--bg-card)'; }, 1000);
        }
      }
    }

    async function handleAddAlimento(event) {
      event.preventDefault();
      const usuarioData = JSON.parse(localStorage.getItem('usuario'));
      if (!usuarioData) { mostrarNotificacion("Sesión expirada."); switchScreen('screen-login'); return; }
      
      const ubicacion = document.getElementById('add-ubicacion').value;
      if (!ubicacion) { mostrarNotificacion("Por favor seleccioná una ubicación."); return; }

      try {
        const respuesta = await fetch(`${API_URL}/alimentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuario_id: usuarioData.id, ubicacion: ubicacion,
            nombre: document.getElementById('add-nombre').value,
            marca: document.getElementById('add-marca').value,
            categoria: document.getElementById('add-categoria').value,
            estado_fisico: document.getElementById('add-estado-fisico').value,
            cantidad: document.getElementById('add-cantidad').value,
            unidad: document.getElementById('add-unidad').value,
            fecha_vencimiento: document.getElementById('add-fecha').value
          })
        });
        if (respuesta.ok) {
          mostrarNotificacion("¡Alimento guardado con éxito!", "success");
          event.target.reset(); document.getElementById('group-estado-fisico').style.display = 'none';
          updateDashboardStats(); abrirLugar(ubicacion);
        } else {
          const data = await respuesta.json(); mostrarNotificacion("Error: " + data.mensaje, "error");
        }
      } catch (error) { console.error(error); }
    }

    function prepararAgregarAlimento() {
      // 1. Leemos el nombre del lugar actual desde el título de la pantalla
      const lugarActual = document.getElementById('storage-title').innerText;
      
      // 2. Seleccionamos automáticamente ese lugar en el formulario
      const selectUbicacion = document.getElementById('add-ubicacion');
      selectUbicacion.value = lugarActual;
      
      // 3. Ocultamos el div para que el usuario no lo vea
      document.getElementById('grupo-ubicacion').style.display = 'none';
      
      // 4. Cambiamos a la pantalla de agregar alimento
      switchScreen('screen-add');
    }
// Variables globales para guardar qué estamos borrando
let alimentoAResolver = null;
let lugarAlimentoAResolver = null;

// 1. Abre el nuevo modal
function borrarAlimento(idAlimento, nombreLugar) {
  alimentoAResolver = idAlimento;
  lugarAlimentoAResolver = nombreLugar;
  document.getElementById('resolve-modal').classList.add('active');
  lucide.createIcons();
}

// 2. Cierra el modal y limpia las variables
function cerrarResolucion() {
  document.getElementById('resolve-modal').classList.remove('active');
  alimentoAResolver = null;
  lugarAlimentoAResolver = null;
}

// 3. Envía el request al backend con el motivo
async function ejecutarResolucion(motivo) {
  if (!alimentoAResolver) return;

  try {
    // Le pegamos al backend pasando el motivo por query string
    const respuesta = await fetch(`${API_URL}/alimentos/${alimentoAResolver}?motivo=${motivo}`, { 
        method: 'DELETE' 
    });
    
    if (respuesta.ok) {
      mostrarNotificacion(`Alimento marcado como ${motivo}`, "success");
      loadAlimentos(lugarAlimentoAResolver);
      updateDashboardStats(); // Actualiza los números del inicio
    } else {
      const data = await respuesta.json();
      mostrarNotificacion("Error: " + data.mensaje, "error");
    }
  } catch (error) { 
    console.error("Error resolviendo alimento:", error); 
    mostrarNotificacion("Error de conexión", "error");
  } finally {
    cerrarResolucion(); // Cerramos el modal salga bien o mal
  }
}

    // --- LÓGICA DE ALIMENTOS ODIADOS ---
    let odiadosArray = [];

    function addOdiado() {
      const input = document.getElementById('input-odiado');
      const val = input.value.trim();
      
      if (val !== '' && !odiadosArray.includes(val)) {
        odiadosArray.push(val);
        input.value = ''; 
        renderOdiados();
      }
    }

    function removeOdiado(itemABorrar) {
      odiadosArray = odiadosArray.filter(item => item !== itemABorrar);
      renderOdiados();
    }

    function renderOdiados() {
      const contenedor = document.getElementById('lista-odiados');
      contenedor.innerHTML = '';
      
      odiadosArray.forEach(item => {
        contenedor.innerHTML += `
          <span style="background: var(--danger); color: white; padding: 6px 12px; border-radius: 16px; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;">
            ${item} 
            <i data-lucide="x" style="width: 14px; height: 14px; cursor: pointer;" onclick="removeOdiado('${item}')"></i>
          </span>
        `;
      });
      lucide.createIcons(); 
    }

    // --- ENVIAR EL PERFIL AL BACKEND ---
    async function handleSaveProfile(event) {
      event.preventDefault();
      
      const usuarioData = JSON.parse(localStorage.getItem('usuario'));
      if (!usuarioData) {
        mostrarNotificacion("Sesión expirada.");
        return switchScreen('screen-login');
      }

      const integrantes = document.getElementById('prof-integrantes').value;
      const menores = document.getElementById('prof-menores').checked;
      const dieta = document.getElementById('prof-dieta').value;
      const alergias = document.getElementById('prof-alergias').value;
      
      const selectIntol = document.getElementById('prof-intolerancias');
      const intolerancias = Array.from(selectIntol.selectedOptions).map(opt => opt.value).join(', ');
      
      const alimentos_odiados = odiadosArray.join(', ');

      try {
        const respuesta = await fetch(`${API_URL}/perfil`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuario_id: usuarioData.id,
            cantidad_integrantes: parseInt(integrantes),
            hay_menores: menores,
            tipo_alimentacion: dieta,
            alergias: alergias,
            intolerancias: intolerancias,
            alimentos_odiados: alimentos_odiados
          })
        });
        
        const data = await respuesta.json();
        
        if (respuesta.ok) {
          mostrarNotificacion("¡Perfil familiar actualizado con éxito!", "success");
          switchScreen('screen-account');
        } else {
          mostrarNotificacion("Error: " + data.mensaje, "error");
        }
      } catch (error) {
        console.error("Error guardando perfil:", error);
      }
    }

    async function loadProfile() {
      const usuarioData = JSON.parse(localStorage.getItem('usuario'));
      if (!usuarioData) return;
      
      try {
        const respuesta = await fetch(`${API_URL}/perfil?usuario_id=${usuarioData.id}`);
        const data = await respuesta.json();
        
        if (respuesta.ok) {
          const perfil = data.perfil;
          
          // Llenamos los inputs básicos
          document.getElementById('prof-integrantes').value = perfil.cantidad_integrantes;
          document.getElementById('prof-menores').checked = perfil.hay_menores;
          document.getElementById('prof-dieta').value = perfil.tipo_alimentacion;
          document.getElementById('prof-alergias').value = perfil.alergias || '';
          
          // Llenamos el select múltiple de intolerancias
          const selectIntol = document.getElementById('prof-intolerancias');
          const intolArray = perfil.intolerancias ? perfil.intolerancias.split(', ') : [];
          Array.from(selectIntol.options).forEach(opt => {
            opt.selected = intolArray.includes(opt.value);
          });
          
          // Llenamos la lista de odiados
          odiadosArray = perfil.alimentos_odiados ? perfil.alimentos_odiados.split(', ').filter(item => item !== '') : [];
          renderOdiados();
        }
      } catch (error) {
        console.error("Error cargando perfil:", error);
      }
    }

    // --- LÓGICA DE PESTAÑAS (CHAT / FAVORITOS) ---
    function switchRecipeTab(tab) {
      document.getElementById('tab-btn-chat').classList.remove('active');
      document.getElementById('tab-btn-favs').classList.remove('active');
      document.getElementById('tab-content-chat').classList.remove('active');
      document.getElementById('tab-content-favs').classList.remove('active');

      if (tab === 'chat') {
        document.getElementById('tab-btn-chat').classList.add('active');
        document.getElementById('tab-content-chat').classList.add('active');
        cargarFiltrosChat();
      } else {
        document.getElementById('tab-btn-favs').classList.add('active');
        document.getElementById('tab-content-favs').classList.add('active');
        renderFavoritos();
      }
    }

    // --- ESTADO DEL CHAT ---
    let chatPaso = 0; 

    // --- ENVIAR MENSAJE A LA IA (REAL) ---
    async function handleSendChatUI() {
      const input = document.getElementById('chat-input');
      const mensaje = input.value.trim();
      if (mensaje === '') return;

      const usuarioData = JSON.parse(localStorage.getItem('usuario'));
      if (!usuarioData) return mostrarNotificacion("Por favor, iniciá sesión.");

      const chatContainer = document.getElementById('chat-messages');

      // 1. Dibujar el mensaje del usuario
      chatContainer.innerHTML += `<div class="msg-bubble msg-user">${mensaje}</div>`;
      input.value = '';
      chatContainer.scrollTop = chatContainer.scrollHeight;

      // 2. Burbuja temporal de "Pensando"
      const idCarga = 'loading-' + Date.now();
      chatContainer.innerHTML += `
        <div class="msg-bubble msg-ia" id="${idCarga}" style="color: var(--text-muted);">
          👨‍🍳 El Chef está revisando tu inventario...
        </div>
      `;
      chatContainer.scrollTop = chatContainer.scrollHeight;

      // 3. Mandar los datos al Backend
      try {
        const respuesta = await fetch(`${API_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuario_id: usuarioData.id,
            mensaje: mensaje,
            paso: chatPaso,
            espacios: espaciosParaIA // Le pasamos la barrita de filtros
          })
        });
        
        const data = await respuesta.json();
        document.getElementById(idCarga).remove(); // Borramos el "Pensando..."
        
        if (respuesta.ok) {
          let extraHtml = '';
          
          // Si el paso era 1, significa que la IA nos acaba de dar la receta final.
          // ¡Acá inyectamos el botón de Favoritos!
          if (chatPaso === 1) {
            // Escapamos comillas para no romper el HTML
            const contenidoLimpio = data.respuesta.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
            extraHtml = `
              <br><br><span style="font-size: 0.85rem; color: var(--text-muted);">¿Te gusta esta receta? Guardala:</span>
              <div class="btn-like" onclick="toggleLike(this, 'Receta Guardada', '${contenidoLimpio}')">
                <i data-lucide="heart" style="width: 16px; height: 16px;"></i>
              </div>
            `;
          }

          // Dibujamos la respuesta de Gemini
          chatContainer.innerHTML += `
            <div class="msg-bubble msg-ia">
              ${data.respuesta}
              ${extraHtml}
            </div>
          `;
          
          chatPaso = data.paso_siguiente; // Actualizamos el paso interno
          lucide.createIcons();
          chatContainer.scrollTop = chatContainer.scrollHeight;
        } else {
          mostrarNotificacion("Error del Chef: " + data.mensaje, "error");
        }
      } catch (error) {
        document.getElementById(idCarga).remove();
        console.error("Error conectando con la IA:", error);
      }
    }

    // --- REINICIAR EL CHAT ---
    function clearChat() {
      const chatContainer = document.getElementById('chat-messages');
      chatContainer.innerHTML = `
        <div class="msg-bubble msg-ia">
          ¡Hola! Soy tu Chef virtual. Ya revisé tu heladera y el perfil de tu familia. ¿Qué tenés ganas de comer hoy?
        </div>
      `;
      chatPaso = 0; 
      lucide.createIcons();
    }

    // --- SISTEMA DE LIKES Y GUARDADO DE RECETAS ---
    // --- SISTEMA DE GUARDADO DE RECETAS EN BASE DE DATOS ---

async function toggleLike(btnElement, titulo, contenido) {
  const usuarioData = JSON.parse(localStorage.getItem('usuario'));
  if (!usuarioData) return mostrarNotificacion("Iniciá sesión para guardar recetas.", "error");

  const isLiked = btnElement.classList.contains('liked');

  if (!isLiked) {
    try {
      const respuesta = await fetch(`${API_URL}/recetas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: usuarioData.id, titulo: titulo, contenido: contenido })
      });
      
      if (respuesta.ok) {
        btnElement.classList.add('liked');
        // Visualmente avisamos que se guardó
        btnElement.innerHTML = '<i data-lucide="check" style="width: 16px; height: 16px; color: var(--primary);"></i>';
        lucide.createIcons();
      }
    } catch (error) { console.error("Error guardando receta:", error); }
  }
}

async function renderFavoritos() {
  const usuarioData = JSON.parse(localStorage.getItem('usuario'));
  if (!usuarioData) return;

  const contenedor = document.getElementById('lista-recetas-guardadas');
  contenedor.innerHTML = '<p style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">Cargando tus recetas...</p>';

  try {
    const respuesta = await fetch(`${API_URL}/recetas?usuario_id=${usuarioData.id}`);
    const data = await respuesta.json();

    contenedor.innerHTML = '';
    if (data.recetas.length === 0) {
      contenedor.innerHTML = '<p style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">No tenés recetas guardadas todavía.</p>';
      return;
    }

    data.recetas.forEach(receta => {
      // Escapamos las comillas para que no se rompa el HTML al abrir el modal
      const contenidoLimpio = receta.contenido.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
      
      // Agregamos el ícono de tacho de basura para eliminar la receta
      contenedor.innerHTML += `
        <div class="list-item" onclick="abrirModalReceta('${receta.titulo}', '${contenidoLimpio}')">
          <div class="emoji-icon" style="background: #fef2f2; color: var(--danger);">
            <i data-lucide="heart" style="fill: currentColor;"></i>
          </div>
          <div class="item-text">
            <h4>${receta.titulo}</h4>
            <p>Guardada desde el Chat</p>
          </div>
          <button onclick="event.stopPropagation(); borrarReceta(${receta.id})" style="background: none; border: none; padding: 8px; cursor: pointer; color: var(--danger);">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `;
    });
    lucide.createIcons();
  } catch (error) {
    console.error("Error obteniendo recetas:", error);
  }
}

function borrarReceta(idReceta) {
  mostrarConfirmacion("¿Querés borrar esta receta guardada?", async () => {
    try {
      const respuesta = await fetch(`${API_URL}/recetas/${idReceta}`, { method: 'DELETE' });
      
      if (respuesta.ok) {
        mostrarNotificacion("Receta eliminada", "success");
        renderFavoritos(); // Volvemos a cargar la lista actualizada
      } else {
        const data = await respuesta.json();
        mostrarNotificacion("Error: " + data.mensaje, "error");
      }
    } catch (error) { 
      console.error("Error borrando receta:", error);
      mostrarNotificacion("Error de conexión", "error");
    }
  });
}

    // --- LÓGICA DE FILTROS DE ESPACIO PARA LA IA ---
    let espaciosParaIA = []; 

    async function cargarFiltrosChat() {
      const usuarioData = JSON.parse(localStorage.getItem('usuario'));
      if (!usuarioData) return;
      
      try {
        const respuesta = await fetch(`${API_URL}/lugares?usuario_id=${usuarioData.id}`);
        const data = await respuesta.json();
        
        if (respuesta.ok) {
          const contenedor = document.getElementById('chat-space-filters');
          
          let htmlFiltros = `<div class="filter-chip active" id="chip-todos" onclick="seleccionarTodosEspacios()">Todos</div>`;
          
          data.lugares.forEach(lugar => {
            htmlFiltros += `<div class="filter-chip" id="chip-${lugar.id}" onclick="toggleEspacioChat('${lugar.nombre}', 'chip-${lugar.id}')">${lugar.nombre}</div>`;
          });
          
          contenedor.innerHTML = htmlFiltros;
          espaciosParaIA = []; 
        }
      } catch (error) {
        console.error("Error cargando filtros del chat:", error);
      }
    }

    function seleccionarTodosEspacios() {
      espaciosParaIA = [];
      document.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'));
      document.getElementById('chip-todos').classList.add('active');
    }

    function toggleEspacioChat(nombreLugar, chipId) {
      const chip = document.getElementById(chipId);
      const chipTodos = document.getElementById('chip-todos');
      
      if (espaciosParaIA.includes(nombreLugar)) {
        espaciosParaIA = espaciosParaIA.filter(e => e !== nombreLugar);
        chip.classList.remove('active');
      } else {
        espaciosParaIA.push(nombreLugar);
        chip.classList.add('active');
      }
      
      if (espaciosParaIA.length === 0) {
        chipTodos.classList.add('active');
      } else {
        chipTodos.classList.remove('active');
      }
    }

    function renderFavoritos() {
      const contenedor = document.getElementById('lista-recetas-guardadas');
      contenedor.innerHTML = '';

      if (recetasFavoritas.length === 0) {
        contenedor.innerHTML = '<p style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">No tenés recetas guardadas todavía.</p>';
        return;
      }

      recetasFavoritas.forEach(receta => {
        contenedor.innerHTML += `
          <div class="list-item" onclick="abrirModalReceta('${receta.titulo}', '${receta.contenido}')">
            <div class="emoji-icon" style="background: #fef2f2; color: var(--danger);">
              <i data-lucide="heart" style="fill: currentColor;"></i>
            </div>
            <div class="item-text">
              <h4>${receta.titulo}</h4>
              <p>Guardada desde el Chat</p>
            </div>
            <i data-lucide="chevron-right" color="#cbd5e1"></i>
          </div>
        `;
      });
      lucide.createIcons();
    }

    // --- MODAL FLOTANTE ---
    function abrirModalReceta(titulo, contenido) {
      document.getElementById('modal-title').innerText = titulo;
      document.getElementById('modal-body-content').innerHTML = contenido;
      document.getElementById('recipe-modal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('recipe-modal').classList.remove('active');
    }

    function cerrarSesion() {
      localStorage.removeItem('usuario'); // Borramos los datos del navegador
      document.getElementById('login-identificador').value = ''; // Limpiamos el formulario
      document.getElementById('login-password').value = '';
      switchScreen('screen-login'); // Volvemos al login
    }

    // --- SISTEMA DE NOTIFICACIONES ---
    function mostrarNotificacion(mensaje, tipo = 'success') {
      const container = document.getElementById('toast-container');
      if (!container) return;
      
      const toast = document.createElement('div');
      toast.className = `toast ${tipo}`;
      
      // Elegimos el ícono dependiendo de si es éxito o error
      const icono = tipo === 'success' ? '<i data-lucide="check-circle" style="color: white;"></i>' : '<i data-lucide="alert-circle" style="color: white;"></i>';
      
      toast.innerHTML = `${icono} <span>${mensaje}</span>`;
      container.appendChild(toast);
      lucide.createIcons();
      
      // A los 3 segundos, iniciamos la animación de salida y lo borramos
      setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300); // Espera a que termine la animación
      }, 3000);
    }
    // --- SISTEMA DE CONFIRMACIÓN CUSTOM ---
    let accionConfirmadaActual = null;

    function mostrarConfirmacion(mensaje, callback) {
      document.getElementById('confirm-message').innerText = mensaje;
      document.getElementById('confirm-modal').classList.add('active');
      accionConfirmadaActual = callback; // Guardamos lo que hay que hacer si el usuario dice "Sí"
      lucide.createIcons();
    }

    function cerrarConfirmacion() {
      document.getElementById('confirm-modal').classList.remove('active');
      accionConfirmadaActual = null;
    }

    function ejecutarConfirmacion() {
      if (accionConfirmadaActual) accionConfirmadaActual();
      cerrarConfirmacion();
    }
