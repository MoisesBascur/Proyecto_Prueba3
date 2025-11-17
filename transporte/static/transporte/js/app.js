// --- 1. AUTENTICACIÓN GLOBAL Y HELPERS ---

/**
 * Redirige al usuario a la página de login si no se encuentra un token de acceso.
 * Esta comprobación se ejecuta ANTES de que se cargue el DOM.
 */
if (!localStorage.getItem('access_token') && window.location.pathname !== '/login/') {
    window.location.href = '/login/';
}

/**
 * Obtiene el token de acceso guardado en el localStorage.
 * @returns {string|null} El token de acceso.
 */
function getAccessToken() {
    return localStorage.getItem('access_token');
}

/**
 * Crea el objeto de encabezados (Headers) para las solicitudes fetch.
 * Incluye el token de autorización JWT.
 * @param {boolean} includeContentType - Si es true, añade 'Content-Type: application/json'.
 * @returns {HeadersInit} Objeto de encabezados.
 */
function getAuthHeaders(includeContentType = true) {
    const token = getAccessToken();
    if (!token) {
        console.error('No token found, redirecting to login.');
        window.location.href = '/login/'; // Redirige si el token desaparece
        return null;
    }
    
    const headers = {
        'Authorization': `Bearer ${token}`
    };

    if (includeContentType) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
}

/**
 * Función helper para poblar un <select> desde una API.
 * @param {string} selectId - El ID del elemento <select>.
 * @param {string} apiUrl - El endpoint de la API para obtener los datos.
 * @param {string} textField - El nombre del campo del objeto a mostrar (ej. "nombre").
 * @param {string} [valueField="id"] - El nombre del campo del objeto a usar como valor (ej. "id").
 */
async function populateSelect(selectId, apiUrl, textField, valueField = 'id') {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) {
        console.warn(`Select element with ID "${selectId}" not found.`);
        return;
    }

    try {
        const response = await fetch(apiUrl, { headers: getAuthHeaders(false) });
        if (!response.ok) throw new Error(`Failed to fetch data for ${selectId}`);
        const data = await response.json();
        
        selectElement.innerHTML = '<option value="">(Seleccione...)</option>'; // Opción por defecto
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueField];
            // Para casos como Rutas, donde queremos texto combinado
            if (textField === 'ruta_display') {
                option.textContent = `${item.origen} a ${item.destino}`;
            } else {
                option.textContent = item[textField];
            }
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error(`Error populating select ${selectId}:`, error);
    }
}


// --- 2. LÓGICA PRINCIPAL (AL CARGAR EL DOM) ---

document.addEventListener('DOMContentLoaded', () => {

    // --- Lógica del Sidebar (Logout y Enlace Activo) ---
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login/';
        });
    }

    // Resaltar el enlace activo en el sidebar
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // --- 3. CRUD: VEHÍCULOS ---
    if (window.location.pathname.includes('/vehiculos/')) {
        const API_URL = '/api/vehiculos/';
        const modalElement = document.getElementById('formModal');
        const modal = new bootstrap.Modal(modalElement);
        const form = document.getElementById('crud-form');
        const saveButton = document.getElementById('save-button');
        const tableBody = document.getElementById('crud-table-body');
        const modalTitle = document.getElementById('formModalLabel');

        // LEER (READ)
        const loadData = async () => {
            tableBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
            try {
                // Las vistas de Vehículos son públicas (IsAuthenticatedOrReadOnly)
                const response = await fetch(API_URL); 
                if (!response.ok) throw new Error('Error al cargar vehículos');
                const data = await response.json();
                
                tableBody.innerHTML = '';
                if (data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="5">No se encontraron vehículos.</td></tr>';
                    return;
                }
                
                data.forEach(v => {
                    const row = `
                        <tr>
                            <td>${v.patente}</td>
                            <td>${v.tipo_vehiculo}</td>
                            <td>${v.capacidad_kg}</td>
                            <td>${v.activo ? '<span class="badge bg-success">Sí</span>' : '<span class="badge bg-danger">No</span>'}</td>
                            <td>
                                <button class="btn btn-warning btn-sm btn-editar" data-id="${v.id}">Editar</button>
                                <button class="btn btn-danger btn-sm btn-eliminar" data-id="${v.id}">Eliminar</button>
                            </td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            } catch (error) {
                console.error(error);
                tableBody.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
            }
        };

        // CREAR (CREATE) / ACTUALIZAR (UPDATE)
        const saveData = async () => {
            const vehiculoId = document.getElementById('vehiculo-id').value;
            const url = vehiculoId ? `${API_URL}${vehiculoId}/` : API_URL;
            const method = vehiculoId ? 'PUT' : 'POST';

            const data = {
                patente: document.getElementById('patente').value,
                tipo_vehiculo: document.getElementById('tipo_vehiculo').value,
                capacidad_kg: document.getElementById('capacidad_kg').value,
                activo: document.getElementById('activo').checked,
            };

            try {
                // Se requiere autenticación para Escribir (POST/PUT/DELETE)
                const headers = getAuthHeaders(true);
                if (!headers) return; // Salir si getAuthHeaders falló (ej. no token)

                const response = await fetch(url, {
                    method: method,
                    headers: headers,
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Error al guardar:', errorData);
                    alert(`Error: ${JSON.stringify(errorData)}`);
                    throw new Error('Error al guardar');
                }
                
                modal.hide();
                loadData();
            } catch (error) {
                console.error(error);
            }
        };

        // Cargar datos para EDITAR
        const handleEdit = async (id) => {
            try {
                const response = await fetch(`${API_URL}${id}/`);
                if (!response.ok) throw new Error('Error al cargar datos del vehículo');
                const v = await response.json();

                modalTitle.textContent = 'Editar Vehículo';
                document.getElementById('vehiculo-id').value = v.id;
                document.getElementById('patente').value = v.patente;
                document.getElementById('tipo_vehiculo').value = v.tipo_vehiculo;
                document.getElementById('capacidad_kg').value = v.capacidad_kg;
                document.getElementById('activo').checked = v.activo;
                
                modal.show();
            } catch (error) {
                console.error(error);
            }
        };

        // ELIMINAR (DELETE)
        const handleDelete = async (id) => {
            if (!confirm(`¿Está seguro de que desea eliminar el vehículo ID ${id}?`)) return;
            
            try {
                const headers = getAuthHeaders(false);
                if (!headers) return;

                const response = await fetch(`${API_URL}${id}/`, {
                    method: 'DELETE',
                    headers: headers
                });
                
                if (!response.ok) throw new Error('Error al eliminar');
                
                loadData();
            } catch (error) {
                console.error(error);
                alert('Error al eliminar: ' + error.message);
            }
        };

        // Asignar listeners
        saveButton.addEventListener('click', saveData);
        tableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-editar')) handleEdit(e.target.dataset.id);
            if (e.target.classList.contains('btn-eliminar')) handleDelete(e.target.dataset.id);
        });

        // Limpiar modal al crear nuevo
        modalElement.addEventListener('show.bs.modal', (e) => {
            // Si el botón que lo activó NO es el de editar
            if (!e.relatedTarget || !e.relatedTarget.classList.contains('btn-editar')) {
                modalTitle.textContent = 'Crear Nuevo Vehículo';
                form.reset();
                document.getElementById('vehiculo-id').value = '';
                document.getElementById('activo').checked = true;
            }
        });

        // Carga inicial
        loadData();
    }

    // --- 4. CRUD: AERONAVES ---
    if (window.location.pathname.includes('/aeronaves/')) {
        const API_URL = '/api/aeronaves/';
        const modalElement = document.getElementById('formModal');
        const modal = new bootstrap.Modal(modalElement);
        const form = document.getElementById('crud-form');
        const saveButton = document.getElementById('save-button');
        const tableBody = document.getElementById('crud-table-body');
        const modalTitle = document.getElementById('formModalLabel');

        // LEER (READ)
        const loadData = async () => {
            tableBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
            try {
                const response = await fetch(API_URL);
                if (!response.ok) throw new Error('Error al cargar aeronaves');
                const data = await response.json();
                
                tableBody.innerHTML = '';
                if (data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="5">No se encontraron aeronaves.</td></tr>';
                    return;
                }

                data.forEach(v => {
                    const row = `
                        <tr>
                            <td>${v.matricula}</td>
                            <td>${v.tipo_aeronave}</td>
                            <td>${v.capacidad_kg}</td>
                            <td>${v.activo ? '<span class="badge bg-success">Sí</span>' : '<span class="badge bg-danger">No</span>'}</td>
                            <td>
                                <button class="btn btn-warning btn-sm btn-editar" data-id="${v.id}">Editar</button>
                                <button class="btn btn-danger btn-sm btn-eliminar" data-id="${v.id}">Eliminar</button>
                            </td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            } catch (error) {
                console.error(error);
                tableBody.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
            }
        };

        // CREAR (CREATE) / ACTUALIZAR (UPDATE)
        const saveData = async () => {
            const aeronaveId = document.getElementById('aeronave-id').value;
            const url = aeronaveId ? `${API_URL}${aeronaveId}/` : API_URL;
            const method = aeronaveId ? 'PUT' : 'POST';

            const data = {
                matricula: document.getElementById('matricula').value,
                tipo_aeronave: document.getElementById('tipo_aeronave').value,
                capacidad_kg: document.getElementById('capacidad_kg').value,
                activo: document.getElementById('activo').checked,
            };

            try {
                const headers = getAuthHeaders(true);
                if (!headers) return;

                const response = await fetch(url, {
                    method: method,
                    headers: headers,
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) throw new Error('Error al guardar');
                modal.hide();
                loadData();
            } catch (error) {
                console.error(error);
                alert('Error al guardar la aeronave.');
            }
        };

        // Cargar datos para EDITAR
        const handleEdit = async (id) => {
            try {
                const response = await fetch(`${API_URL}${id}/`);
                if (!response.ok) throw new Error('Error al cargar datos');
                const v = await response.json();

                modalTitle.textContent = 'Editar Aeronave';
                document.getElementById('aeronave-id').value = v.id;
                document.getElementById('matricula').value = v.matricula;
                document.getElementById('tipo_aeronave').value = v.tipo_aeronave;
                document.getElementById('capacidad_kg').value = v.capacidad_kg;
                document.getElementById('activo').checked = v.activo;
                
                modal.show();
            } catch (error) {
                console.error(error);
            }
        };

        // ELIMINAR (DELETE)
        const handleDelete = async (id) => {
            if (!confirm(`¿Está seguro de que desea eliminar la aeronave ID ${id}?`)) return;
            
            try {
                const headers = getAuthHeaders(false);
                if (!headers) return;

                const response = await fetch(`${API_URL}${id}/`, {
                    method: 'DELETE',
                    headers: headers
                });
                
                if (!response.ok) throw new Error('Error al eliminar');
                loadData();
            } catch (error) {
                console.error(error);
                alert('Error al eliminar: ' + error.message);
            }
        };

        // Asignar listeners
        saveButton.addEventListener('click', saveData);
        tableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-editar')) handleEdit(e.target.dataset.id);
            if (e.target.classList.contains('btn-eliminar')) handleDelete(e.target.dataset.id);
        });

        modalElement.addEventListener('show.bs.modal', (e) => {
            if (!e.relatedTarget || !e.relatedTarget.classList.contains('btn-editar')) {
                modalTitle.textContent = 'Crear Nueva Aeronave';
                form.reset();
                document.getElementById('aeronave-id').value = '';
                document.getElementById('activo').checked = true;
            }
        });

        loadData();
    }

    // --- 5. CRUD: RUTAS ---
    if (window.location.pathname.includes('/rutas/')) {
        // (La lógica es idéntica a las anteriores, solo cambian los campos)
        const API_URL = '/api/rutas/';
        const modalElement = document.getElementById('formModal');
        const modal = new bootstrap.Modal(modalElement);
        const form = document.getElementById('crud-form');
        const saveButton = document.getElementById('save-button');
        const tableBody = document.getElementById('crud-table-body');
        const modalTitle = document.getElementById('formModalLabel');

        const loadData = async () => {
            tableBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
            try {
                const response = await fetch(API_URL);
                if (!response.ok) throw new Error('Error al cargar rutas');
                const data = await response.json();
                
                tableBody.innerHTML = '';
                if (data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="5">No se encontraron rutas.</td></tr>';
                    return;
                }
                
                data.forEach(v => {
                    const row = `
                        <tr>
                            <td>${v.origen}</td>
                            <td>${v.destino}</td>
                            <td>${v.tipo_transporte}</td>
                            <td>${v.distancia_km} km</td>
                            <td>
                                <button class="btn btn-warning btn-sm btn-editar" data-id="${v.id}">Editar</button>
                                <button class="btn btn-danger btn-sm btn-eliminar" data-id="${v.id}">Eliminar</button>
                            </td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            } catch (error) {
                console.error(error);
                tableBody.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
            }
        };

        const saveData = async () => {
            const rutaId = document.getElementById('ruta-id').value;
            const url = rutaId ? `${API_URL}${rutaId}/` : API_URL;
            const method = rutaId ? 'PUT' : 'POST';

            const data = {
                origen: document.getElementById('origen').value,
                destino: document.getElementById('destino').value,
                tipo_transporte: document.getElementById('tipo_transporte').value,
                distancia_km: document.getElementById('distancia_km').value,
            };

            try {
                const headers = getAuthHeaders(true);
                if (!headers) return;
                
                const response = await fetch(url, {
                    method: method,
                    headers: headers,
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) throw new Error('Error al guardar');
                modal.hide();
                loadData();
            } catch (error) {
                console.error(error);
                alert('Error al guardar la ruta.');
            }
        };

        const handleEdit = async (id) => {
            try {
                const response = await fetch(`${API_URL}${id}/`);
                if (!response.ok) throw new Error('Error al cargar datos');
                const v = await response.json();

                modalTitle.textContent = 'Editar Ruta';
                document.getElementById('ruta-id').value = v.id;
                document.getElementById('origen').value = v.origen;
                document.getElementById('destino').value = v.destino;
                document.getElementById('tipo_transporte').value = v.tipo_transporte;
                document.getElementById('distancia_km').value = v.distancia_km;
                
                modal.show();
            } catch (error) {
                console.error(error);
            }
        };

        const handleDelete = async (id) => {
            if (!confirm(`¿Está seguro de que desea eliminar la ruta ID ${id}?`)) return;
            
            try {
                const headers = getAuthHeaders(false);
                if (!headers) return;
                
                const response = await fetch(`${API_URL}${id}/`, {
                    method: 'DELETE',
                    headers: headers
                });
                
                if (!response.ok) throw new Error('Error al eliminar');
                loadData();
            } catch (error) {
                console.error(error);
                alert('Error al eliminar: ' + error.message);
            }
        };

        saveButton.addEventListener('click', saveData);
        tableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-editar')) handleEdit(e.target.dataset.id);
            if (e.target.classList.contains('btn-eliminar')) handleDelete(e.target.dataset.id);
        });

        modalElement.addEventListener('show.bs.modal', (e) => {
            if (!e.relatedTarget || !e.relatedTarget.classList.contains('btn-editar')) {
                modalTitle.textContent = 'Crear Nueva Ruta';
                form.reset();
                document.getElementById('ruta-id').value = '';
            }
        });

        loadData();
    }
    
    // --- 6. CRUD: CONDUCTORES (Protegido) ---
    if (window.location.pathname.includes('/conductores/')) {
        // Esta vista está protegida, TODAS las llamadas fetch deben usar getAuthHeaders()
        const API_URL = '/api/conductores/';
        const modalElement = document.getElementById('formModal');
        const modal = new bootstrap.Modal(modalElement);
        const form = document.getElementById('crud-form');
        const saveButton = document.getElementById('save-button');
        const tableBody = document.getElementById('crud-table-body');
        const modalTitle = document.getElementById('formModalLabel');

        const loadData = async () => {
            tableBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
            try {
                const headers = getAuthHeaders(false);
                if (!headers) return;

                const response = await fetch(API_URL, { headers: headers });
                if (response.status === 401) window.location.href = '/login/';
                if (!response.ok) throw new Error('Error al cargar conductores');
                
                const data = await response.json();
                tableBody.innerHTML = '';
                if (data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="5">No se encontraron conductores.</td></tr>';
                    return;
                }
                
                data.forEach(v => {
                    const row = `
                        <tr>
                            <td>${v.nombre}</td>
                            <td>${v.rut}</td>
                            <td>${v.licencia}</td>
                            <td>${v.activo ? '<span class="badge bg-success">Sí</span>' : '<span class="badge bg-danger">No</span>'}</td>
                            <td>
                                <button class="btn btn-warning btn-sm btn-editar" data-id="${v.id}">Editar</button>
                                <button class="btn btn-danger btn-sm btn-eliminar" data-id="${v.id}">Eliminar</button>
                            </td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            } catch (error) {
                console.error(error);
                tableBody.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
            }
        };

        const saveData = async () => {
            const conductorId = document.getElementById('conductor-id').value;
            const url = conductorId ? `${API_URL}${conductorId}/` : API_URL;
            const method = conductorId ? 'PUT' : 'POST';

            const data = {
                nombre: document.getElementById('nombre').value,
                rut: document.getElementById('rut').value,
                licencia: document.getElementById('licencia').value,
                activo: document.getElementById('activo').checked,
            };

            try {
                const headers = getAuthHeaders(true);
                if (!headers) return;
                
                const response = await fetch(url, {
                    method: method,
                    headers: headers,
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) throw new Error('Error al guardar');
                modal.hide();
                loadData();
            } catch (error) {
                console.error(error);
                alert('Error al guardar el conductor.');
            }
        };

        const handleEdit = async (id) => {
            try {
                const headers = getAuthHeaders(false);
                if (!headers) return;
                
                const response = await fetch(`${API_URL}${id}/`, { headers: headers });
                if (!response.ok) throw new Error('Error al cargar datos');
                const v = await response.json();

                modalTitle.textContent = 'Editar Conductor';
                document.getElementById('conductor-id').value = v.id;
                document.getElementById('nombre').value = v.nombre;
                document.getElementById('rut').value = v.rut;
                document.getElementById('licencia').value = v.licencia;
                document.getElementById('activo').checked = v.activo;
                
                modal.show();
            } catch (error) {
                console.error(error);
            }
        };

        const handleDelete = async (id) => {
            if (!confirm(`¿Está seguro de que desea eliminar el conductor ID ${id}?`)) return;
            
            try {
                const headers = getAuthHeaders(false);
                if (!headers) return;
                
                const response = await fetch(`${API_URL}${id}/`, {
                    method: 'DELETE',
                    headers: headers
                });
                
                if (!response.ok) throw new Error('Error al eliminar');
                loadData();
            } catch (error) {
                console.error(error);
                alert('Error al eliminar: ' + error.message);
            }
        };

        saveButton.addEventListener('click', saveData);
        tableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-editar')) handleEdit(e.target.dataset.id);
            if (e.target.classList.contains('btn-eliminar')) handleDelete(e.target.dataset.id);
        });

        modalElement.addEventListener('show.bs.modal', (e) => {
            if (!e.relatedTarget || !e.relatedTarget.classList.contains('btn-editar')) {
                modalTitle.textContent = 'Registrar Nuevo Conductor';
                form.reset();
                document.getElementById('conductor-id').value = '';
                document.getElementById('activo').checked = true;
            }
        });

        loadData();
    }
    
    // --- 7. CRUD: PILOTOS (Protegido) ---
    if (window.location.pathname.includes('/pilotos/')) {
        // (Lógica idéntica a Conductores, pero con API_URL = '/api/pilotos/' y campos de piloto)
        const API_URL = '/api/pilotos/';
        const modalElement = document.getElementById('formModal');
        const modal = new bootstrap.Modal(modalElement);
        const form = document.getElementById('crud-form');
        const saveButton = document.getElementById('save-button');
        const tableBody = document.getElementById('crud-table-body');
        const modalTitle = document.getElementById('formModalLabel');

        const loadData = async () => {
            tableBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
            try {
                const headers = getAuthHeaders(false);
                if (!headers) return;

                const response = await fetch(API_URL, { headers: headers });
                if (response.status === 401) window.location.href = '/login/';
                if (!response.ok) throw new Error('Error al cargar pilotos');
                
                const data = await response.json();
                tableBody.innerHTML = '';
                if (data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="5">No se encontraron pilotos.</td></tr>';
                    return;
                }
                
                data.forEach(v => {
                    const row = `
                        <tr>
                            <td>${v.nombre}</td>
                            <td>${v.rut}</td>
                            <td>${v.certificacion}</td>
                            <td>${v.activo ? '<span class="badge bg-success">Sí</span>' : '<span class="badge bg-danger">No</span>'}</td>
                            <td>
                                <button class="btn btn-warning btn-sm btn-editar" data-id="${v.id}">Editar</button>
                                <button class="btn btn-danger btn-sm btn-eliminar" data-id="${v.id}">Eliminar</button>
                            </td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            } catch (error) {
                console.error(error);
                tableBody.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
            }
        };

        const saveData = async () => {
            const pilotoId = document.getElementById('piloto-id').value;
            const url = pilotoId ? `${API_URL}${pilotoId}/` : API_URL;
            const method = pilotoId ? 'PUT' : 'POST';

            const data = {
                nombre: document.getElementById('nombre').value,
                rut: document.getElementById('rut').value,
                certificacion: document.getElementById('certificacion').value,
                activo: document.getElementById('activo').checked,
            };

            try {
                const headers = getAuthHeaders(true);
                if (!headers) return;
                
                const response = await fetch(url, {
                    method: method,
                    headers: headers,
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) throw new Error('Error al guardar');
                modal.hide();
                loadData();
            } catch (error) {
                console.error(error);
                alert('Error al guardar el piloto.');
            }
        };

        const handleEdit = async (id) => {
            try {
                const headers = getAuthHeaders(false);
                if (!headers) return;

                const response = await fetch(`${API_URL}${id}/`, { headers: headers });
                if (!response.ok) throw new Error('Error al cargar datos');
                const v = await response.json();

                modalTitle.textContent = 'Editar Piloto';
                document.getElementById('piloto-id').value = v.id;
                document.getElementById('nombre').value = v.nombre;
                document.getElementById('rut').value = v.rut;
                document.getElementById('certificacion').value = v.certificacion;
                document.getElementById('activo').checked = v.activo;
                
                modal.show();
            } catch (error) {
                console.error(error);
            }
        };

        const handleDelete = async (id) => {
            if (!confirm(`¿Está seguro de que desea eliminar el piloto ID ${id}?`)) return;
            
            try {
                const headers = getAuthHeaders(false);
                if (!headers) return;
                
                const response = await fetch(`${API_URL}${id}/`, {
                    method: 'DELETE',
                    headers: headers
                });
                
                if (!response.ok) throw new Error('Error al eliminar');
                loadData();
            } catch (error) {
                console.error(error);
                alert('Error al eliminar: ' + error.message);
            }
        };

        saveButton.addEventListener('click', saveData);
        tableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-editar')) handleEdit(e.target.dataset.id);
            if (e.target.classList.contains('btn-eliminar')) handleDelete(e.target.dataset.id);
        });

        modalElement.addEventListener('show.bs.modal', (e) => {
            if (!e.relatedTarget || !e.relatedTarget.classList.contains('btn-editar')) {
                modalTitle.textContent = 'Registrar Nuevo Piloto';
                form.reset();
                document.getElementById('piloto-id').value = '';
                document.getElementById('activo').checked = true;
            }
        });

        loadData();
    }
    
    // --- 8. CRUD: CLIENTES ---
    if (window.location.pathname.includes('/clientes/')) {
        // (Lógica idéntica a Vehículos, pero con API_URL = '/api/clientes/' y campos de cliente)
        const API_URL = '/api/clientes/';
        const modalElement = document.getElementById('formModal');
        const modal = new bootstrap.Modal(modalElement);
        const form = document.getElementById('crud-form');
        const saveButton = document.getElementById('save-button');
        const tableBody = document.getElementById('crud-table-body');
        const modalTitle = document.getElementById('formModalLabel');

        const loadData = async () => {
            tableBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
            try {
                const response = await fetch(API_URL);
                if (!response.ok) throw new Error('Error al cargar clientes');
                const data = await response.json();
                
                tableBody.innerHTML = '';
                if (data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="5">No se encontraron clientes.</td></tr>';
                    return;
                }
                
                data.forEach(v => {
                    const row = `
                        <tr>
                            <td>${v.nombre}</td>
                            <td>${v.rut}</td>
                            <td>${v.telefono || ''}</td>
                            <td>${v.email || ''}</td>
                            <td>
                                <button class="btn btn-warning btn-sm btn-editar" data-id="${v.id}">Editar</button>
                                <button class="btn btn-danger btn-sm btn-eliminar" data-id="${v.id}">Eliminar</button>
                            </td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            } catch (error) {
                console.error(error);
                tableBody.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
            }
        };

        const saveData = async () => {
            const clienteId = document.getElementById('cliente-id').value;
            const url = clienteId ? `${API_URL}${clienteId}/` : API_URL;
            const method = clienteId ? 'PUT' : 'POST';

            const data = {
                nombre: document.getElementById('nombre').value,
                rut: document.getElementById('rut').value,
                telefono: document.getElementById('telefono').value,
                email: document.getElementById('email').value,
            };

            try {
                const headers = getAuthHeaders(true);
                if (!headers) return;
                
                const response = await fetch(url, {
                    method: method,
                    headers: headers,
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) throw new Error('Error al guardar');
                modal.hide();
                loadData();
            } catch (error) {
                console.error(error);
                alert('Error al guardar el cliente.');
            }
        };

        const handleEdit = async (id) => {
            try {
                const response = await fetch(`${API_URL}${id}/`);
                if (!response.ok) throw new Error('Error al cargar datos');
                const v = await response.json();

                modalTitle.textContent = 'Editar Cliente';
                document.getElementById('cliente-id').value = v.id;
                document.getElementById('nombre').value = v.nombre;
                document.getElementById('rut').value = v.rut;
                document.getElementById('telefono').value = v.telefono;
                document.getElementById('email').value = v.email;
                
                modal.show();
            } catch (error) {
                console.error(error);
            }
        };

        const handleDelete = async (id) => {
            if (!confirm(`¿Está seguro de que desea eliminar el cliente ID ${id}?`)) return;
            
            try {
                const headers = getAuthHeaders(false);
                if (!headers) return;
                
                const response = await fetch(`${API_URL}${id}/`, {
                    method: 'DELETE',
                    headers: headers
                });
                
                if (!response.ok) throw new Error('Error al eliminar');
                loadData();
            } catch (error) {
                console.error(error);
                alert('Error al eliminar: ' + error.message);
            }
        };

        saveButton.addEventListener('click', saveData);
        tableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-editar')) handleEdit(e.target.dataset.id);
            if (e.target.classList.contains('btn-eliminar')) handleDelete(e.target.dataset.id);
        });

        modalElement.addEventListener('show.bs.modal', (e) => {
            if (!e.relatedTarget || !e.relatedTarget.classList.contains('btn-editar')) {
                modalTitle.textContent = 'Registrar Nuevo Cliente';
                form.reset();
                document.getElementById('cliente-id').value = '';
            }
        });

        loadData();
    }
    
    // --- 9. CRUD: DESPACHOS (Complejo y Protegido) ---
    if (window.location.pathname.includes('/despachos/')) {
        const API_URL = '/api/despachos/';
        const modalElement = document.getElementById('formModal');
        const modal = new bootstrap.Modal(modalElement);
        const form = document.getElementById('crud-form');
        const saveButton = document.getElementById('save-button');
        const tableBody = document.getElementById('crud-table-body');
        const modalTitle = document.getElementById('formModalLabel');
        
        // Cargar todos los dropdowns del formulario
        const loadDropdowns = () => {
            populateSelect('ruta', '/api/rutas/', 'ruta_display'); // 'ruta_display' es un truco, usará 'origen a destino'
            populateSelect('vehiculo', '/api/vehiculos/', 'patente');
            populateSelect('aeronave', '/api/aeronaves/', 'matricula');
            populateSelect('conductor', '/api/conductores/', 'nombre');
            populateSelect('piloto', '/api/pilotos/', 'nombre');
        };
        
        // LEER (READ)
        const loadData = async () => {
            tableBody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';
            try {
                const headers = getAuthHeaders(false);
                if (!headers) return;

                const response = await fetch(API_URL, { headers: headers });
                if (response.status === 401) window.location.href = '/login/';
                if (!response.ok) throw new Error('Error al cargar despachos');
                
                const data = await response.json();
                tableBody.innerHTML = '';
                if (data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="7">No se encontraron despachos.</td></tr>';
                    return;
                }
                
                data.forEach(v => {
                    const row = `
                        <tr>
                            <td>${v.id}</td>
                            <td>${v.fecha_despacho}</td>
                            <td>${v.estado}</td>
                            <td>Ruta ${v.ruta}</td>
                            <td>${v.vehiculo ? 'Vehículo ' + v.vehiculo : (v.aeronave ? 'Aeronave ' + v.aeronave : 'N/A')}</td>
                            <td>$${v.costo_envio}</td>
                            <td>
                                <button class="btn btn-warning btn-sm btn-editar" data-id="${v.id}">Editar</button>
                                <button class="btn btn-danger btn-sm btn-eliminar" data-id="${v.id}">Eliminar</button>
                            </td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            } catch (error) {
                console.error(error);
                tableBody.innerHTML = `<tr><td colspan="7">${error.message}</td></tr>`;
            }
        };

        // CREAR (CREATE) / ACTUALIZAR (UPDATE)
        const saveData = async () => {
            const despachoId = document.getElementById('despacho-id').value;
            const url = despachoId ? `${API_URL}${despachoId}/` : API_URL;
            const method = despachoId ? 'PUT' : 'POST';

            const data = {
                fecha_despacho: document.getElementById('fecha_despacho').value,
                estado: document.getElementById('estado').value,
                costo_envio: document.getElementById('costo_envio').value,
                ruta: document.getElementById('ruta').value,
                // Enviar null si el campo está vacío
                vehiculo: document.getElementById('vehiculo').value || null,
                aeronave: document.getElementById('aeronave').value || null,
                conductor: document.getElementById('conductor').value || null,
                piloto: document.getElementById('piloto').value || null,
            };

            try {
                const headers = getAuthHeaders(true);
                if (!headers) return;
                
                const response = await fetch(url, {
                    method: method,
                    headers: headers,
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Error al guardar despacho:', errorData);
                    alert(`Error: ${JSON.stringify(errorData)}`);
                    throw new Error('Error al guardar');
                }
                modal.hide();
                loadData();
            } catch (error) {
                console.error(error);
            }
        };

        // Cargar datos para EDITAR
        const handleEdit = async (id) => {
            try {
                const headers = getAuthHeaders(false);
                if (!headers) return;
                
                const response = await fetch(`${API_URL}${id}/`, { headers: headers });
                if (!response.ok) throw new Error('Error al cargar datos');
                const v = await response.json();

                modalTitle.textContent = 'Editar Despacho';
                document.getElementById('despacho-id').value = v.id;
                document.getElementById('fecha_despacho').value = v.fecha_despacho;
                document.getElementById('estado').value = v.estado;
                document.getElementById('costo_envio').value = v.costo_envio;
                document.getElementById('ruta').value = v.ruta;
                // Manejar valores null en dropdowns
                document.getElementById('vehiculo').value = v.vehiculo || '';
                document.getElementById('aeronave').value = v.aeronave || '';
                document.getElementById('conductor').value = v.conductor || '';
                document.getElementById('piloto').value = v.piloto || '';
                
                modal.show();
            } catch (error) {
                console.error(error);
            }
        };

        // ELIMINAR (DELETE)
        const handleDelete = async (id) => {
            if (!confirm(`¿Está seguro de que desea eliminar el despacho ID ${id}?`)) return;
            
            try {
                const headers = getAuthHeaders(false);
                if (!headers) return;
                
                const response = await fetch(`${API_URL}${id}/`, {
                    method: 'DELETE',
                    headers: headers
                });
                
                if (!response.ok) throw new Error('Error al eliminar');
                loadData();
            } catch (error) {
                console.error(error);
                alert('Error al eliminar: ' + error.message);
            }
        };

        saveButton.addEventListener('click', saveData);
        tableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-editar')) handleEdit(e.target.dataset.id);
            if (e.target.classList.contains('btn-eliminar')) handleDelete(e.target.dataset.id);
        });

        modalElement.addEventListener('show.bs.modal', (e) => {
            if (!e.relatedTarget || !e.relatedTarget.classList.contains('btn-editar')) {
                modalTitle.textContent = 'Crear Nuevo Despacho';
                form.reset();
                document.getElementById('despacho-id').value = '';
                document.getElementById('estado').value = 'PENDIENTE'; // Default
            }
        });

        // Carga inicial
        loadDropdowns();
        loadData();
    }
    
    // --- 10. CRUD: CARGAS (Complejo y Protegido) ---
    if (window.location.pathname.includes('/cargas/')) {
        const API_URL = '/api/cargas/';
        const modalElement = document.getElementById('formModal');
        const modal = new bootstrap.Modal(modalElement);
        const form = document.getElementById('crud-form');
        const saveButton = document.getElementById('save-button');
        const tableBody = document.getElementById('crud-table-body');
        const modalTitle = document.getElementById('formModalLabel');

        // Cargar dropdowns
        const loadDropdowns = () => {
            populateSelect('despacho', '/api/despachos/', 'id'); // Simple, por ID
            populateSelect('cliente', '/api/clientes/', 'nombre');
        };

        // LEER (READ)
        const loadData = async () => {
            tableBody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';
            try {
                const headers = getAuthHeaders(false);
                if (!headers) return;

                const response = await fetch(API_URL, { headers: headers });
                if (response.status === 401) window.location.href = '/login/';
                if (!response.ok) throw new Error('Error al cargar cargas');
                
                const data = await response.json();
                tableBody.innerHTML = '';
                if (data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="7">No se encontraron cargas.</td></tr>';
                    return;
                }
                
                data.forEach(v => {
                    const row = `
                        <tr>
                            <td>${v.id}</td>
                            <td>${v.descripcion}</td>
                            <td>${v.despacho}</td>
                            <td>${v.cliente}</td>
                            <td>${v.peso_kg} kg</td>
                            <td>$${v.valor_declarado}</td>
                            <td>
                                <button class="btn btn-warning btn-sm btn-editar" data-id="${v.id}">Editar</button>
                                <button class="btn btn-danger btn-sm btn-eliminar" data-id="${v.id}">Eliminar</button>
                            </td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            } catch (error) {
                console.error(error);
                tableBody.innerHTML = `<tr><td colspan="7">${error.message}</td></tr>`;
            }
        };

        // CREAR (CREATE) / ACTUALIZAR (UPDATE)
        const saveData = async () => {
            const cargaId = document.getElementById('carga-id').value;
            const url = cargaId ? `${API_URL}${cargaId}/` : API_URL;
            const method = cargaId ? 'PUT' : 'POST';

            const data = {
                descripcion: document.getElementById('descripcion').value,
                despacho: document.getElementById('despacho').value,
                cliente: document.getElementById('cliente').value,
                peso_kg: document.getElementById('peso_kg').value,
                valor_declarado: document.getElementById('valor_declarado').value,
            };

            try {
                const headers = getAuthHeaders(true);
                if (!headers) return;
                
                const response = await fetch(url, {
                    method: method,
                    headers: headers,
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) throw new Error('Error al guardar');
                modal.hide();
                loadData();
            } catch (error) {
                console.error(error);
                alert('Error al guardar la carga.');
            }
        };

        // Cargar datos para EDITAR
        const handleEdit = async (id) => {
            try {
                const headers = getAuthHeaders(false);
                if (!headers) return;
                
                const response = await fetch(`${API_URL}${id}/`, { headers: headers });
                if (!response.ok) throw new Error('Error al cargar datos');
                const v = await response.json();

                modalTitle.textContent = 'Editar Carga';
                document.getElementById('carga-id').value = v.id;
                document.getElementById('descripcion').value = v.descripcion;
                document.getElementById('despacho').value = v.despacho;
                document.getElementById('cliente').value = v.cliente;
                document.getElementById('peso_kg').value = v.peso_kg;
                document.getElementById('valor_declarado').value = v.valor_declarado;
                
                modal.show();
            } catch (error) {
                console.error(error);
            }
        };

        // ELIMINAR (DELETE)
        const handleDelete = async (id) => {
            if (!confirm(`¿Está seguro de que desea eliminar la carga ID ${id}?`)) return;
            
            try {
                const headers = getAuthHeaders(false);
                if (!headers) return;
                
                const response = await fetch(`${API_URL}${id}/`, {
                    method: 'DELETE',
                    headers: headers
                });
                
                if (!response.ok) throw new Error('Error al eliminar');
                loadData();
            } catch (error) {
                console.error(error);
                alert('Error al eliminar: ' + error.message);
            }
        };

        saveButton.addEventListener('click', saveData);
        tableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-editar')) handleEdit(e.target.dataset.id);
            if (e.target.classList.contains('btn-eliminar')) handleDelete(e.target.dataset.id);
        });

        modalElement.addEventListener('show.bs.modal', (e) => {
            if (!e.relatedTarget || !e.relatedTarget.classList.contains('btn-editar')) {
                modalTitle.textContent = 'Registrar Nueva Carga';
                form.reset();
                document.getElementById('carga-id').value = '';
            }
        });

        // Carga inicial
        loadDropdowns();
        loadData();
    }

}); // Fin del DOMContentLoaded