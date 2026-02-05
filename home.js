document.addEventListener('DOMContentLoaded', function () {
    // Initialize Swiper
    const swiper = new Swiper('.swiper-container', {
        slidesPerView: 1,
        spaceBetween: 20,
        loop: true,
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        breakpoints: {
            640: {
                slidesPerView: 2,
                spaceBetween: 20,
            },
            1024: {
                slidesPerView: 3,
                spaceBetween: 30,
            },
        },
        autoplay: {
            delay: 4000,
            disableOnInteraction: false,
        },
    });

    // Card Click Handlers (Navigate to first book on general click)
    if (document.getElementById('injilCard')) {
        document.getElementById('injilCard').addEventListener('click', function () {
            window.location.href = 'injil-matius.html';
        });
    }
    if (document.getElementById('tauratCard')) {
        document.getElementById('tauratCard').addEventListener('click', function () {
            window.location.href = 'taurat-kejadian.html';
        });
    }
    if (document.getElementById('zaburCard')) {
        document.getElementById('zaburCard').addEventListener('click', function () {
            window.location.href = 'zabur-mazmur.html';
        });
    }

    // Scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.content-section, .library-card, .media-slider-section').forEach(el => {
        observer.observe(el);
    });

    // Card hover effect helper
    document.querySelectorAll('.library-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            // Optional: add any specific hover logic here if needed
        });
    });

    // Back to Top Button
    const backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});