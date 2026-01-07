let movimientos = [];
let cedears = [];
let sheetConfig = { id: '' };

let myChart = null; // Variable para controlar el gráfico

// --- 1. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Cargar datos del navegador
    const guardado = localStorage.getItem('misInversiones_local');
    if (guardado) {
        movimientos = JSON.parse(guardado);
    }

    const guardadoCedears = localStorage.getItem('misInversiones_cedears');
    if (guardadoCedears) {
        cedears = JSON.parse(guardadoCedears);
    }

    const guardadoConfig = localStorage.getItem('misInversiones_config');
    if (guardadoConfig) {
        sheetConfig = JSON.parse(guardadoConfig);
    }

    // Fecha de hoy por defecto
    document.getElementById('fecha').valueAsDate = new Date();

    // Configurar interfaz inicial
    toggleCampos();
    actualizarInterfaz();
    actualizarCedearsUI();
});

// --- PESTAÑAS ---
function cambiarTab(tab) {
    // Botones
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-tab-${tab}`).classList.add('active');

    // Vistas
    document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');
    document.getElementById(`view-${tab}`).style.display = 'block';
}

// --- 2. INTERACCIÓN FORMULARIO ---
function toggleCampos() {
    const tipo = document.getElementById('tipo').value;
    const divInversion = document.getElementById('campos-inversion');
    const inputMontoFinal = document.getElementById('monto_final');

    if (tipo === 'inversion') {
        divInversion.style.display = 'block';
        inputMontoFinal.setAttribute('required', 'true');
    } else {
        divInversion.style.display = 'none';
        inputMontoFinal.removeAttribute('required');
        inputMontoFinal.value = '';
    }
}

// --- 3. GUARDAR MOVIMIENTO ---
document.getElementById('form-inversion').addEventListener('submit', function(e) {
    e.preventDefault();

    const fecha = document.getElementById('fecha').value;
    const tipo = document.getElementById('tipo').value;
    const capital = parseFloat(document.getElementById('capital').value) || 0;

    // Lógica Específica de Inversión
    let montoFinal = 0;
    let ganancia = 0;
    let plazo = '-';
    let tasa = '-';

    if (tipo === 'inversion') {
        montoFinal = parseFloat(document.getElementById('monto_final').value) || 0;
        ganancia = montoFinal - capital; // Cálculo automático
        plazo = document.getElementById('plazo').value || '-';
        tasa = document.getElementById('tasa').value || '-';
    }

    const nuevoMovimiento = {
        id: Date.now(),
        fecha,
        tipo,
        capital,
        montoFinal,
        ganancia,
        plazo,
        tasa
    };

    movimientos.push(nuevoMovimiento);
    guardarYActualizar();

    // Limpiar campos (menos fecha y tipo)
    document.getElementById('capital').value = '';
    document.getElementById('monto_final').value = '';
    document.getElementById('plazo').value = '';
    document.getElementById('tasa').value = '';
});

// --- 4. BORRAR ---
function eliminarMovimiento(id) {
    if(confirm('¿Borrar este registro?')) {
        movimientos = movimientos.filter(mov => mov.id !== id);
        guardarYActualizar();
    }
}

function borrarTodo() {
    if(confirm('⚠️ ¿ESTÁS SEGURO? Se borrarán todos los datos.')) {
        movimientos = [];
        guardarYActualizar();
    }
}

function guardarYActualizar() {
    localStorage.setItem('misInversiones_local', JSON.stringify(movimientos));
    actualizarInterfaz();
}

// Formateador de moneda
function formatoMoneda(num) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(num);
}

// --- LOGICA CEDEARS ---

document.getElementById('form-cedear').addEventListener('submit', function(e) {
    e.preventDefault();

    const ticker = document.getElementById('cedear-ticker').value.toUpperCase();
    const cantidad = parseFloat(document.getElementById('cedear-cantidad').value);
    const precioCompra = parseFloat(document.getElementById('cedear-precio-compra').value);

    // Si ya existe, sumamos posición (promediando precio)
    const existente = cedears.find(c => c.ticker === ticker);
    if(existente) {
        const totalCosto = (existente.cantidad * existente.precioCompra) + (cantidad * precioCompra);
        const totalCantidad = existente.cantidad + cantidad;
        existente.precioCompra = totalCosto / totalCantidad;
        existente.cantidad = totalCantidad;
    } else {
        cedears.push({
            id: Date.now(),
            ticker,
            cantidad,
            precioCompra,
            precioActual: precioCompra // Inicialmente el mismo
        });
    }

    guardarCedears();
    document.getElementById('form-cedear').reset();
});

function eliminarCedear(ticker) {
    if(confirm('¿Eliminar posición de ' + ticker + '?')) {
        cedears = cedears.filter(c => c.ticker !== ticker);
        guardarCedears();
    }
}

function guardarCedears() {
    localStorage.setItem('misInversiones_cedears', JSON.stringify(cedears));
    actualizarCedearsUI();
}

function actualizarCedearsUI() {
    const tbody = document.querySelector('#cedears-table tbody');
    tbody.innerHTML = '';

    let totalValor = 0;
    let totalInversion = 0;

    cedears.forEach(c => {
        const valorActual = c.cantidad * c.precioActual;
        const costoTotal = c.cantidad * c.precioCompra;
        const ganancia = valorActual - costoTotal;
        const porcentaje = costoTotal > 0 ? ((valorActual - costoTotal) / costoTotal) * 100 : 0;

        totalValor += valorActual;
        totalInversion += costoTotal;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${c.ticker}</strong></td>
            <td>${c.cantidad}</td>
            <td>${formatoMoneda(c.precioCompra)}</td>
            <td style="color: #ccc">${formatoMoneda(c.precioActual)}</td>
            <td>${formatoMoneda(valorActual)}</td>
            <td class="${ganancia >= 0 ? 'positive' : ''}" style="color: ${ganancia < 0 ? '#ff5555' : ''}">
                ${formatoMoneda(ganancia)} <small>(${porcentaje.toFixed(2)}%)</small>
            </td>
            <td><button class="btn-delete" onclick="eliminarCedear('${c.ticker}')">🗑️</button></td>
        `;
        tbody.appendChild(tr);
    });

    const totalGanancia = totalValor - totalInversion;
    document.getElementById('cedear-total-valor').innerText = formatoMoneda(totalValor);
    document.getElementById('cedear-total-inversion').innerText = formatoMoneda(totalInversion);

    const elemGanancia = document.getElementById('cedear-total-ganancia');
    elemGanancia.innerText = formatoMoneda(totalGanancia);
    elemGanancia.style.color = totalGanancia >= 0 ? '#00ff9d' : '#ff5555';
}

// --- GOOGLE SHEETS INTEGRATION ---

function configurarSheet() {
    const id = prompt("Ingresa el ID de tu Google Sheet (debe ser pública y tener ticker en Col A, precio en Col B):", sheetConfig.id);
    if(id !== null) {
        sheetConfig.id = id.trim();
        localStorage.setItem('misInversiones_config', JSON.stringify(sheetConfig));
        alert("ID guardado. Ahora intenta 'Actualizar Precios'.");
    }
}

async function actualizarPrecios() {
    if(!sheetConfig.id) {
        alert("Primero configura el ID de la Google Sheet.");
        return;
    }

    const btn = document.querySelector('.btn-update');
    const originalText = btn.innerText;
    btn.innerText = "⏳ Cargando...";
    btn.disabled = true;

    try {
        // Usamos la API de visualización de Google para obtener JSON limpio
        // Query select A, B.  tq=select%20A%2CB
        const url = `https://docs.google.com/spreadsheets/d/${sheetConfig.id}/gviz/tq?tqx=out:json&tq=select%20A%2CB`;

        const response = await fetch(url);
        const text = await response.text();

        // La respuesta de Google viene envuelta en google.visualization.Query.setResponse(...);
        // Necesitamos limpiar eso.
        const jsonText = text.substring(47).slice(0, -2);
        const json = JSON.parse(jsonText);

        const rows = json.table.rows;
        let actualizados = 0;

        // Crear mapa de precios { "AAPL": 150.20, ... }
        const preciosMap = {};
        rows.forEach(row => {
            if(row.c && row.c[0] && row.c[1]) {
                const ticker = row.c[0].v ? row.c[0].v.toString().toUpperCase().trim() : "";
                const precio = typeof row.c[1].v === 'number' ? row.c[1].v : parseFloat(row.c[1].v);

                // Limpiar prefijos comunes si el usuario los pone en la sheet (ej BCBA:AAPL -> AAPL)
                const cleanTicker = ticker.replace('BCBA:', '').replace('CEDEAR:', '');
                if(cleanTicker && !isNaN(precio)) {
                    preciosMap[cleanTicker] = precio;
                    // También guardamos con prefijo por si acaso
                    preciosMap[ticker] = precio;
                }
            }
        });

        // Actualizar nuestros cedears
        cedears.forEach(c => {
            if(preciosMap[c.ticker]) {
                c.precioActual = preciosMap[c.ticker];
                actualizados++;
            }
        });

        guardarCedears();
        alert(`Se actualizaron ${actualizados} posiciones correctamente.`);

    } catch (error) {
        console.error(error);
        alert("Error al obtener datos. Verifica que la hoja sea PÚBLICA y el ID sea correcto.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}


// --- 5. ACTUALIZAR PANTALLA ---
function actualizarInterfaz() {
    let totalDepositos = 0;
    let totalRetiros = 0;
    let totalGanancia = 0;
    let opsInversion = 0;

    const tbody = document.querySelector('#investment-table tbody');
    tbody.innerHTML = '';

    // Ordenar para la tabla (Nuevos arriba)
    const historialTabla = [...movimientos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    historialTabla.forEach(mov => {
        // Cálculos
        if (mov.tipo === 'ingreso') totalDepositos += mov.capital;
        if (mov.tipo === 'retiro') totalRetiros += mov.capital;
        if (mov.tipo === 'inversion') {
            opsInversion++;
            totalGanancia += mov.ganancia;
        }

        // Render Fila
        const tr = document.createElement('tr');

        let tipoLabel = '';
        let colorMonto = '';

        if(mov.tipo === 'ingreso') {
            tipoLabel = '<span style="color:#00ff9d; font-weight:bold">DEPÓSITO</span>';
            colorMonto = '#00ff9d';
        } else if(mov.tipo === 'retiro') {
            tipoLabel = '<span style="color:#ff5555; font-weight:bold">RETIRO</span>';
            colorMonto = '#ff5555';
        } else {
            tipoLabel = '<span style="color:#00d4ff; font-weight:bold">INVERSIÓN</span>';
        }

        tr.innerHTML = `
            <td>${mov.fecha.split('-').reverse().join('/')}</td>
            <td>${tipoLabel}</td>
            <td style="color:${colorMonto}">${formatoMoneda(mov.capital)}</td>
            <td>${mov.tipo === 'inversion' ? formatoMoneda(mov.montoFinal) : '-'}</td>
            <td class="${mov.ganancia > 0 ? 'positive' : ''}">
                ${mov.tipo === 'inversion' ? formatoMoneda(mov.ganancia) : '-'}
            </td>
            <td><button class="btn-delete" onclick="eliminarMovimiento(${mov.id})">🗑️</button></td>
        `;
        tbody.appendChild(tr);
    });

    // Actualizar Tarjetas
    const saldoActual = (totalDepositos - totalRetiros) + totalGanancia;
    document.getElementById('total-capital').innerText = formatoMoneda(saldoActual);
    document.getElementById('total-ganancia').innerText = formatoMoneda(totalGanancia);
    document.getElementById('total-ops').innerText = opsInversion;

    // Renderizar Gráfico
    renderizarGrafico();
}

// --- 6. GRÁFICO CON DOBLE EJE Y ---
function renderizarGrafico() {
    const ctx = document.getElementById('myChart').getContext('2d');

    // Preparar datos cronológicos (Viejos a nuevos)
    const datosCronologicos = [...movimientos].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    // Agrupar por fecha
    const historialDia = new Map();
    let acumuladoCapital = 0;
    let acumuladoGanancia = 0;

    datosCronologicos.forEach(mov => {
        if(mov.tipo === 'ingreso') acumuladoCapital += mov.capital;
        if(mov.tipo === 'retiro') acumuladoCapital -= mov.capital;
        if(mov.tipo === 'inversion') {
            acumuladoGanancia += mov.ganancia;
            acumuladoCapital += mov.ganancia;
        }

        historialDia.set(mov.fecha, {
            capital: acumuladoCapital,
            ganancia: acumuladoGanancia
        });
    });

    const etiquetas = Array.from(historialDia.keys());
    // Formatear fechas para el eje X (dd/mm)
    const etiquetasFormateadas = etiquetas.map(f => f.split('-').reverse().slice(0, 2).join('/'));

    const dataCapital = Array.from(historialDia.values()).map(d => d.capital);
    const dataGanancia = Array.from(historialDia.values()).map(d => d.ganancia);

    if (myChart) {
        myChart.destroy();
    }

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: etiquetasFormateadas,
            datasets: [
                {
                    label: 'Capital Actual',
                    data: dataCapital,
                    borderColor: '#00d4ff', // AZUL
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    yAxisID: 'y', // Eje Izquierdo
                },
                {
                    label: 'Ganancia Acumulada',
                    data: dataGanancia,
                    borderColor: '#00ff9d', // VERDE
                    backgroundColor: 'rgba(0, 255, 157, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    yAxisID: 'y1', // Eje Derecho
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { labels: { color: 'white' } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#aaa' },
                    grid: { color: '#333' }
                },
                y: { // EJE IZQUIERDO (CAPITAL)
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: { color: '#00d4ff' },
                    grid: { color: '#333' },
                    title: { display: true, text: 'Capital', color: '#00d4ff' }
                },
                y1: { // EJE DERECHO (GANANCIA)
                    type: 'linear',
                    display: true,
                    position: 'right',
                    ticks: { color: '#00ff9d' },
                    grid: {
                        drawOnChartArea: false // Evita que se mezclen las líneas de fondo
                    },
                    title: { display: true, text: 'Ganancia', color: '#00ff9d' }
                }
            }
        }
    });
}