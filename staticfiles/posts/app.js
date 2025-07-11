document.addEventListener('DOMContentLoaded', () => {
    // Конфигурация
    const API_BASE_URL = 'http://127.0.0.1:8000/api';
    const MEDIA_URL = 'http://127.0.0.1:8000/media';
    const DEFAULT_IMAGE = 'https://via.placeholder.com/400x300?text=Image+Not+Available';

    // Элементы DOM
    const elements = {
        newPostForm: document.getElementById('new-post-form'),
        newPostText: document.getElementById('new-post-text'),
        newPostImages: document.getElementById('new-post-images'),
        postsContainer: document.getElementById('posts'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        logoutBtn: document.getElementById('logout-btn'),
        userInfo: document.getElementById('user-info'),
        usernameDisplay: document.getElementById('username-display'),
        authForms: document.getElementById('auth-forms'),
        showLoginBtn: document.getElementById('show-login'),
        showRegisterBtn: document.getElementById('show-register'),
        authButtons: document.getElementById('auth-buttons')
    };

    // Инициализированные Swiper-карусели
    const swiperInstances = [];

    /**
     * Показывает индикатор загрузки
     * @param {HTMLElement} element - Элемент, к которому прикрепляется индикатор
     * @param {string} text - Текст для отображения (по умолчанию "Загрузка...")
     */
    const showLoading = (element, text = 'Загрузка...') => {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-indicator';
        loadingDiv.innerHTML = `
            <div class="spinner"></div>
            <span>${text}</span>
        `;
        element.style.position = 'relative';
        element.appendChild(loadingDiv);
        return loadingDiv;
    };

    /**
     * Скрывает индикатор загрузки
     * @param {HTMLElement} element - Элемент, содержащий индикатор загрузки
     */
    const hideLoading = (element) => {
        const loader = element.querySelector('.loading-indicator');
        if (loader) {
            loader.remove();
        }
    };

    /**
     * Проверяет авторизацию пользователя
     * @returns {Promise<boolean>} - true, если пользователь авторизован, иначе false
     */
    const checkAuth = async () => {
        const token = localStorage.getItem('access_token');
        return !!token;
    };

    /**
     * Обновляет интерфейс в зависимости от статуса авторизации
     */
    const updateUI = async () => {
        const isAuth = await checkAuth();
        elements.authForms.classList.toggle('hidden', isAuth);
        elements.newPostForm.classList.toggle('hidden', !isAuth);
        elements.userInfo.classList.toggle('hidden', !isAuth);

        if (isAuth) {
            const username = localStorage.getItem('username');
            if (username) elements.usernameDisplay.textContent = username;
        }

        await fetchPosts();
    };

    /**
     * Загружает посты с сервера
     * @param {number} page - Номер страницы для пагинации
     */
    let currentPage = 1;
    const fetchPosts = async (page = 1) => {
        const loadingIndicator = showLoading(elements.postsContainer, 'Загрузка постов...');
        
        try {
            const headers = {};
            const token = localStorage.getItem('access_token');
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/posts/?page=${page}`, { headers });
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки постов');
            }

            const data = await response.json();
            renderPosts(data.results || data);
            renderPagination(data);
        } catch (error) {
            console.error('Error:', error);
            showError('Ошибка загрузки постов: ' + error.message);
        } finally {
            hideLoading(elements.postsContainer);
        }
    };

    /**
     * Отображает элементы пагинации
     * @param {Object} data - Данные из ответа API, включая информацию о пагинации
     */
    const renderPagination = (data) => {
        if (!data.next && !data.previous) return;

        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination';

        if (data.previous) {
            const prevBtn = document.createElement('button');
            prevBtn.textContent = '← Назад';
            prevBtn.addEventListener('click', () => {
                currentPage--;
                fetchPosts(currentPage);
            });
            paginationDiv.appendChild(prevBtn);
        }

        const pageInfo = document.createElement('span');
        pageInfo.textContent = ` Страница ${currentPage} `;
        paginationDiv.appendChild(pageInfo);

        if (data.next) {
            const nextBtn = document.createElement('button');
            nextBtn.textContent = 'Вперед →';
            nextBtn.addEventListener('click', () => {
                currentPage++;
                fetchPosts(currentPage);
            });
            paginationDiv.appendChild(nextBtn);
        }

        elements.postsContainer.appendChild(paginationDiv);
    };

    /**
     * Отображает сообщение об ошибке
     * @param {string} message - Сообщение об ошибке
     */
    const showError = (message) => {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    };

    /**
     * Отрисовывает список постов на странице
     * @param {Array} posts - Массив объектов постов
     */
    const renderPosts = (posts) => {
        // Уничтожаем старые карусели
        swiperInstances.forEach(swiper => swiper.destroy());
        swiperInstances.length = 0;

        if (!posts || posts.length === 0) {
            elements.postsContainer.innerHTML = '<p class="no-posts">Пока нет постов</p>';
            return;
        }

        elements.postsContainer.innerHTML = posts.map(post => `
            <div class="post" data-id="${post.id}">
                <div class="post-header">
                    <h3>${post.author}</h3>
                    ${post.can_edit ? `
                        <div class="post-actions">
                            <button class="edit-post-btn" data-id="${post.id}">✏️</button>
                            <button class="delete-post-btn" data-id="${post.id}">🗑️</button>
                        </div>
                    ` : ''}
                </div>
                <p class="post-text">${post.text}</p>
                ${post.images && post.images.length ? `
                    <div class="swiper post-images">
                        <div class="swiper-wrapper">
                            ${post.images.map(img => `
                                <div class="swiper-slide">
                                    <img src="${img}" 
                                        loading="lazy" 
                                        alt="Изображение поста ${post.author}"
                                        onerror="this.src='${DEFAULT_IMAGE}';this.onerror=null;"
                                        class="post-image">
                                </div>
                            `).join('')}
                        </div>
                        <div class="swiper-pagination"></div>
                        <div class="swiper-button-prev"></div>
                        <div class="swiper-button-next"></div>
                    </div>
                ` : ''}
                <p class="post-date">${new Date(post.created_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}</p>
                <button class="like-btn" data-id="${post.id}" ${!localStorage.getItem('access_token') ? 'disabled' : ''}>
                    ❤️ ${post.likes_count} ${post.likes_count === 1 ? 'лайк' : 'лайков'}
                </button>
                <div class="comments">
                    <h5>Комментарии (${post.comments ? post.comments.length : 0})</h5>
                    ${(post.comments || []).map(comment => `
                        <div class="comment">
                            <strong>${comment.author}:</strong> ${comment.text}
                            <small>${new Date(comment.created_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}</small>
                            ${localStorage.getItem('access_token') ? (
                                post.can_edit ? `
                                    <button class="btn btn-link text-danger ms-auto delete-comment-btn" data-id="${comment.id}">❌ Удалить</button>
                                ` : ''
                            ) : ''}
                        </div>
                    `).join('')}
                    ${localStorage.getItem('access_token') ? `
                        <form class="comment-form" data-id="${post.id}">
                            <input type="text" placeholder="Ваш комментарий" required>
                            <button type="submit">Отправить</button>
                        </form>
                    ` : '<p>Зарегистрируйтесь и войдите, чтобы оставить комментарий или поставить лайк</p>'}
                </div>
            </div>
        `).join('');

        // Инициализация каруселей
        document.querySelectorAll('.swiper').forEach(swiperEl => {
            const swiper = new Swiper(swiperEl, {
                loop: true,
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                },
                autoplay: {
                    delay: 5000,
                    disableOnInteraction: false,
                },
                effect: 'slide',
                grabCursor: true,
                centeredSlides: true,
                slidesPerView: 'auto',
                spaceBetween: 10,
            });
            swiperInstances.push(swiper);
        });

        // Назначение обработчиков событий
        document.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', () => handleLike(btn.dataset.id));
        });

        document.querySelectorAll('.comment-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = form.querySelector('input');
                handleComment(form.dataset.id, input.value);
                input.value = '';
            });
        });

        document.querySelectorAll('.edit-post-btn').forEach(btn => {
            btn.addEventListener('click', () => showEditForm(btn.dataset.id));
        });

        document.querySelectorAll('.delete-comment-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const commentId = btn.dataset.id;
                const postId = btn.closest('.post').dataset.id;

                if (!confirm('Вы уверены, что хотите удалить этот комментарий?')) return;

                try {
                    const token = localStorage.getItem('access_token');
                    if (!token) throw new Error('Требуется авторизация');

                    const response = await fetch(`${API_BASE_URL}/comments/${commentId}/delete/`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.detail || 'Ошибка удаления комментария');
                    }

                    alert('Комментарий успешно удален');
                    await fetchPosts(); // Обновляем список постов
                } catch (error) {
                    console.error('Error:', error);
                    showError(error.message);
                }
            });
        });

        document.querySelectorAll('.delete-post-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const postId = btn.dataset.id;

                if (!confirm('Вы уверены, что хотите удалить этот пост?')) return;

                try {
                    const token = localStorage.getItem('access_token');
                    if (!token) throw new Error('Требуется авторизация');

                    const response = await fetch(`${API_BASE_URL}/posts/${postId}/`, {
                        method: 'DELETE',
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    const result = await response.json(); // Читаем JSON-ответ
                    
                    if (!response.ok) {
                        throw new Error(result.detail || 'Ошибка удаления поста');
                    }

                    showError(result.message || 'Пост успешно удален'); // Показываем сообщение
                    await fetchPosts(); // Обновляем список
                } catch (error) {
                    console.error('Error:', error);
                    showError(error.message);
                }
            });
        });
    };

    /**
     * Создает новый пост
     * @param {Event} e - Событие отправки формы
     */
    const handleNewPost = async (e) => {
        e.preventDefault();
        const text = elements.newPostText.value.trim();
        const images = elements.newPostImages.files;

        if (!text) return showError('Введите текст поста не менее 5 символов');
        if (images.length > 10) return showError('Не более 10 изображений');

        const formData = new FormData();
        formData.append('text', text);
        Array.from(images).forEach(img => formData.append('images', img));

        const loadingIndicator = showLoading(elements.newPostForm, 'Публикация поста...');

        try {
            const token = localStorage.getItem('access_token');
            if (!token) throw new Error('Требуется авторизация');

            const response = await fetch(`${API_BASE_URL}/posts/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Ошибка создания поста');
            }

            elements.newPostText.value = '';
            elements.newPostImages.value = '';
            await fetchPosts();
        } catch (error) {
            console.error('Error:', error);
            showError(error.message);
        } finally {
            hideLoading(elements.newPostForm);
        }
    };

    /**
     * Показывает форму редактирования поста
     * @param {string} postId - ID редактируемого поста
     */
    const showEditForm = async (postId) => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) throw new Error('Требуется авторизация');

            const response = await fetch(`${API_BASE_URL}/posts/${postId}/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Ошибка загрузки поста');

            const post = await response.json();
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h2>Редактировать пост</h2>
                    <form id="edit-post-form">
                        <textarea id="edit-post-text" required>${post.text}</textarea>
                        <div class="current-images">
                            <h4>Текущие изображения:</h4>
                            ${post.images && post.images.length ? 
                                post.images.map(img => `
                                    <div class="image-container">
                                        <img src="${img}" alt="Post image">
                                        <button type="button" class="delete-image-btn" data-url="${img}">Удалить</button>
                                    </div>
                                `).join('') : 
                                '<p>Нет изображений</p>'
                            }
                        </div>
                        <label for="edit-post-images">Добавить новые изображения:</label>
                        <input type="file" id="edit-post-images" accept="image/*" multiple>
                        <div class="modal-buttons">
                            <button type="submit">Сохранить</button>
                            <button type="button" class="cancel-edit">Отмена</button>
                        </div>
                    </form>
                </div>
            `;

            document.body.appendChild(modal);
            modal.querySelector('.cancel-edit').addEventListener('click', () => modal.remove());

            modal.querySelector('#edit-post-form').addEventListener('submit', async (e) => { 
                e.preventDefault();
                const loadingIndicator = showLoading(modal.querySelector('.modal-content'), 'Сохранение...');
                
                try {
                    await handleEditPost(postId, modal);
                } catch (error) {
                    showError(error.message);
                } finally {
                    hideLoading(modal.querySelector('.modal-content'));
                }
            });

            modal.querySelectorAll('.delete-image-btn').forEach(btn => {
                btn.addEventListener('click', () => handleDeleteImage(postId, btn.dataset.url, modal));
            });
        } catch (error) {
            console.error('Error:', error);
            showError(error.message);
        }
    };

    /**
     * Редактирует существующий пост
     * @param {string} postId - ID редактируемого поста
     * @param {HTMLElement} modal - Элемент модального окна
     */
    const handleEditPost = async (postId, modal) => {
        const text = modal.querySelector('#edit-post-text').value.trim();
        const images = modal.querySelector('#edit-post-images').files;

        if (!text) throw new Error('Введите текст поста не менее 5 символов');

        const formData = new FormData();
        formData.append('text', text);
        Array.from(images).forEach(img => formData.append('images', img));

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Ошибка редактирования поста');
            }

            modal.remove();
            await fetchPosts();
        } catch (error) {
            throw error;
        }
    };

    /**
     * Удаляет изображение из поста
     * @param {string} postId - ID поста
     * @param {string} imageUrl - URL изображения
     * @param {HTMLElement} modal - Элемент модального окна
     */
    const handleDeleteImage = async (postId, imageUrl, modal) => {
        if (!confirm('Вы уверены, что хотите удалить это изображение?')) return;

        try {
            const token = localStorage.getItem('access_token');
            const imageName = imageUrl.split('/').pop();

            const response = await fetch(`${API_BASE_URL}/posts/${postId}/delete_image/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ image_name: imageName })
            });

            if (!response.ok) throw new Error('Ошибка удаления изображения');

            modal.remove();
            await showEditForm(postId);
        } catch (error) {
            console.error('Error:', error);
            showError(error.message);
        }
    };

    /**
     * Ставит/убирает лайк к посту
     * @param {string} postId - ID поста
     */
    const handleLike = async (postId) => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) throw new Error('Требуется авторизация');

            const response = await fetch(`${API_BASE_URL}/posts/${postId}/like/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Ошибка лайка');

            await fetchPosts();
        } catch (error) {
            console.error('Error:', error);
            showError(error.message);
        }
    };

    /**
     * Добавляет комментарий к посту
     * @param {string} postId - ID поста
     * @param {string} text - Текст комментария
     */
    const handleComment = async (postId, text) => {
        if (!text.trim()) return showError('Введите комментарий');

        try {
            const token = localStorage.getItem('access_token');
            if (!token) throw new Error('Требуется авторизация');

            const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });

            if (!response.ok) throw new Error('Ошибка комментария');

            await fetchPosts();
        } catch (error) {
            console.error('Error:', error);
            showError(error.message);
        }
    };

    /**
     * Авторизует пользователя
     * @param {Event} e - Событие отправки формы
     */
    const handleLogin = async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const loadingIndicator = showLoading(elements.loginForm, 'Вход...');

        try {
            const response = await fetch(`${API_BASE_URL}/token/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Ошибка авторизации');
            }

            const { access, refresh } = await response.json();
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            localStorage.setItem('username', username);

            elements.loginForm.classList.add('hidden');
            elements.registerForm.classList.add('hidden');
            await updateUI();
        } catch (error) {
            console.error('Error:', error);
            showError(error.message);
        } finally {
            hideLoading(elements.loginForm);
        }
    };

    /**
     * Регистрирует нового пользователя
     * @param {Event} e - Событие отправки формы
     */
    const handleRegister = async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const loadingIndicator = showLoading(elements.registerForm, 'Регистрация...');

        try {
            const response = await fetch(`${API_BASE_URL}/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(Object.values(errorData).join(', '));
            }

            showError('Регистрация успешна! Войдите в систему.');
            elements.loginForm.classList.remove('hidden');
            elements.registerForm.classList.add('hidden');
        } catch (error) {
            console.error('Error:', error);
            showError(error.message);
        } finally {
            hideLoading(elements.registerForm);
        }
    };

    /**
     * Выходит из системы
     */
    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('username');
        updateUI();
    };

    /**
     * Инициализирует приложение
     */
    const init = () => {
        elements.newPostForm.addEventListener('submit', handleNewPost);
        elements.loginForm.addEventListener('submit', handleLogin);
        elements.registerForm.addEventListener('submit', handleRegister);
        elements.logoutBtn.addEventListener('click', handleLogout);
        elements.showLoginBtn.addEventListener('click', () => {
            elements.loginForm.classList.remove('hidden');
            elements.registerForm.classList.add('hidden');
        });
        elements.showRegisterBtn.addEventListener('click', () => {
            elements.registerForm.classList.remove('hidden');
            elements.loginForm.classList.add('hidden');
        });
        updateUI();
    };

    init();
});