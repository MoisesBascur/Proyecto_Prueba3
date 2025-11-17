// login.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorDiv = document.getElementById('login-error');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que el formulario se envíe de la forma tradicional
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Oculta errores previos
        errorDiv.classList.add('d-none');

        try {
            // Llama al endpoint de la API que creamos en la Fase 4
            const response = await fetch('/api/token/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            if (!response.ok) {
                // Si la respuesta es 401 (Unauthorized) o similar
                throw new Error('Usuario o contraseña incorrectos');
            }

            // Si el login es exitoso...
            const data = await response.json();
            
            // 1. Guarda los tokens en el almacenamiento local del navegador
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            
            // 2. Redirige al usuario a la página principal
            window.location.href = '/'; // Redirige a la página de "Inicio"

        } catch (error) {
            // Muestra el error en el div
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('d-none');
        }
    });
});