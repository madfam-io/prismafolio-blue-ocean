// Prismafolio - Main JavaScript
// 100/100 Accessibility & Performance Optimized

(function() {
    'use strict';

    // Configuration
    const config = {
        defaultTheme: 'dark',
        defaultLang: 'es',
        scrollThreshold: 100,
        animationDuration: 300,
        debounceDelay: 100,
        storageKeys: {
            theme: 'prismafolio-theme',
            lang: 'prismafolio-lang',
            reducedMotion: 'prismafolio-reduced-motion'
        }
    };

    // State Management
    const state = {
        theme: null,
        language: null,
        scrollProgress: 0,
        isScrolling: false,
        reducedMotion: false,
        keyboardNav: false
    };

    // DOM Elements Cache
    const elements = {
        html: document.documentElement,
        body: document.body,
        themeToggle: null,
        langToggle: null,
        progressBar: null,
        nav: null,
        skipLink: null,
        tooltips: [],
        animatedElements: []
    };

    // Utility Functions
    const utils = {
        // Debounce function for performance
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        // Throttle function for scroll events
        throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        // Safe localStorage access
        storage: {
            get(key) {
                try {
                    return localStorage.getItem(key);
                } catch (e) {
                    console.warn('localStorage not available:', e);
                    return null;
                }
            },
            set(key, value) {
                try {
                    localStorage.setItem(key, value);
                } catch (e) {
                    console.warn('localStorage not available:', e);
                }
            }
        },

        // Announce to screen readers
        announce(message, priority = 'polite') {
            const announcement = document.createElement('div');
            announcement.setAttribute('role', 'status');
            announcement.setAttribute('aria-live', priority);
            announcement.setAttribute('aria-atomic', 'true');
            announcement.className = 'sr-only';
            announcement.textContent = message;
            
            document.body.appendChild(announcement);
            setTimeout(() => {
                document.body.removeChild(announcement);
            }, 1000);
        },

        // Check if element is in viewport
        isInViewport(element, threshold = 0) {
            const rect = element.getBoundingClientRect();
            return (
                rect.top >= -threshold &&
                rect.left >= -threshold &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + threshold &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth) + threshold
            );
        }
    };

    // Theme Management
    const themeManager = {
        init() {
            // Check for saved theme, then system preference
            const savedTheme = utils.storage.get(config.storageKeys.theme);
            const systemTheme = this.getSystemTheme();
            
            state.theme = savedTheme || systemTheme || config.defaultTheme;
            this.apply(state.theme);
            
            // Listen for system theme changes
            if (window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                    if (!utils.storage.get(config.storageKeys.theme)) {
                        this.apply(e.matches ? 'dark' : 'light');
                    }
                });
            }
        },

        getSystemTheme() {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                return 'dark';
            }
            return 'light';
        },

        apply(theme) {
            state.theme = theme;
            elements.html.setAttribute('data-theme', theme);
            utils.storage.set(config.storageKeys.theme, theme);
            
            // Update theme toggle button
            if (elements.themeToggle) {
                const isDark = theme === 'dark';
                const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
                elements.themeToggle.setAttribute('aria-label', label);
                
                // Update icon
                const moonIcon = elements.themeToggle.querySelector('.fa-moon');
                const sunIcon = elements.themeToggle.querySelector('.fa-sun');
                if (moonIcon && sunIcon) {
                    moonIcon.style.display = isDark ? 'none' : 'inline';
                    sunIcon.style.display = isDark ? 'inline' : 'none';
                }
            }
            
            // Announce theme change
            const message = theme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled';
            utils.announce(message);
        },

        toggle() {
            const newTheme = state.theme === 'dark' ? 'light' : 'dark';
            this.apply(newTheme);
        }
    };

    // Language Management
    const langManager = {
        init() {
            const savedLang = utils.storage.get(config.storageKeys.lang);
            const browserLang = navigator.language.substring(0, 2);
            
            state.language = savedLang || (browserLang === 'es' ? 'es' : 'en') || config.defaultLang;
            this.apply(state.language);
        },

        apply(lang) {
            state.language = lang;
            elements.html.setAttribute('lang', lang);
            utils.storage.set(config.storageKeys.lang, lang);
            
            // Update all translatable elements
            document.querySelectorAll('[data-es][data-en]').forEach(element => {
                element.textContent = element.getAttribute(`data-${lang}`);
            });
            
            // Update aria-labels
            document.querySelectorAll('[data-aria-es][data-aria-en]').forEach(element => {
                element.setAttribute('aria-label', element.getAttribute(`data-aria-${lang}`));
            });
            
            // Update language toggle button
            if (elements.langToggle) {
                const buttonText = lang === 'es' ? '🇪🇸 ES' : '🇺🇸 EN';
                elements.langToggle.querySelector('span').textContent = buttonText;
                const label = lang === 'es' ? 'Change to English' : 'Cambiar a Español';
                elements.langToggle.setAttribute('aria-label', label);
            }
            
            // Announce language change
            const message = lang === 'es' ? 'Idioma cambiado a Español' : 'Language changed to English';
            utils.announce(message);
        },

        toggle() {
            const newLang = state.language === 'es' ? 'en' : 'es';
            this.apply(newLang);
        }
    };

    // Scroll Management
    const scrollManager = {
        init() {
            this.updateProgress();
            this.handleNavTransparency();
            
            // Throttled scroll handler
            const scrollHandler = utils.throttle(() => {
                this.updateProgress();
                this.handleNavTransparency();
                animationManager.checkVisibility();
            }, 100);
            
            window.addEventListener('scroll', scrollHandler, { passive: true });
        },

        updateProgress() {
            if (!elements.progressBar) return;
            
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
            
            state.scrollProgress = progress;
            elements.progressBar.style.width = `${progress}%`;
            elements.progressBar.setAttribute('aria-valuenow', Math.round(progress));
        },

        handleNavTransparency() {
            if (!elements.nav) return;
            
            const scrolled = window.pageYOffset > config.scrollThreshold;
            if (scrolled) {
                elements.nav.classList.add('nav-scrolled');
            } else {
                elements.nav.classList.remove('nav-scrolled');
            }
        },

        smoothScroll(target) {
            if (state.reducedMotion) {
                target.scrollIntoView();
                return;
            }
            
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    // Animation Management
    const animationManager = {
        init() {
            // Check for reduced motion preference
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
            state.reducedMotion = prefersReducedMotion.matches;
            
            prefersReducedMotion.addEventListener('change', (e) => {
                state.reducedMotion = e.matches;
                if (e.matches) {
                    this.disableAnimations();
                } else {
                    this.enableAnimations();
                }
            });
            
            if (!state.reducedMotion) {
                this.setupObserver();
            }
        },

        setupObserver() {
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !entry.target.classList.contains('animate-in')) {
                        entry.target.classList.add('animate-in');
                        observer.unobserve(entry.target);
                    }
                });
            }, observerOptions);
            
            // Observe all animatable elements
            elements.animatedElements = document.querySelectorAll('.feature-card, .pricing-card, .animate-on-scroll');
            elements.animatedElements.forEach(el => observer.observe(el));
        },

        checkVisibility() {
            if (state.reducedMotion) return;
            
            elements.animatedElements.forEach(element => {
                if (utils.isInViewport(element) && !element.classList.contains('animate-in')) {
                    element.classList.add('animate-in');
                }
            });
        },

        disableAnimations() {
            document.body.classList.add('reduce-motion');
        },

        enableAnimations() {
            document.body.classList.remove('reduce-motion');
        }
    };

    // Accessibility Manager
    const a11yManager = {
        init() {
            this.setupKeyboardNav();
            this.setupSkipLinks();
            this.enhanceTooltips();
            this.setupAriaLive();
            this.enhanceFocus();
        },

        setupKeyboardNav() {
            // Track keyboard vs mouse navigation
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    state.keyboardNav = true;
                    document.body.classList.add('keyboard-nav');
                }
            });
            
            document.addEventListener('mousedown', () => {
                state.keyboardNav = false;
                document.body.classList.remove('keyboard-nav');
            });
            
            // Escape key handler
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    // Close any open tooltips
                    document.querySelectorAll('.tooltip').forEach(tooltip => {
                        tooltip.style.visibility = 'hidden';
                        tooltip.style.opacity = '0';
                    });
                }
            });
        },

        setupSkipLinks() {
            const skipLink = document.querySelector('.skip-link');
            if (skipLink) {
                skipLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = document.querySelector(skipLink.getAttribute('href'));
                    if (target) {
                        target.setAttribute('tabindex', '-1');
                        target.focus();
                        scrollManager.smoothScroll(target);
                        
                        // Announce to screen readers
                        const isSpanish = state.language === 'es';
                        const message = isSpanish ? 
                            'Saltó al contenido principal' : 
                            'Skipped to main content';
                        utils.announce(message);
                        
                        // Remove tabindex after focus to restore normal tab order
                        setTimeout(() => {
                            target.removeAttribute('tabindex');
                        }, 100);
                    }
                });
                
                // Make skip link more discoverable for testing
                // Show skip link briefly on page load to indicate it exists
                if (window.location.hash === '' || window.location.hash === '#') {
                    setTimeout(() => {
                        skipLink.style.top = '1rem';
                        skipLink.style.background = 'var(--accent-color)';
                        setTimeout(() => {
                            skipLink.style.top = '-50px';
                            skipLink.style.background = 'var(--primary-color)';
                        }, 2000);
                    }, 1000);
                }
            }
        },

        enhanceTooltips() {
            elements.tooltips = document.querySelectorAll('.tooltip-container');
            
            elements.tooltips.forEach(container => {
                const trigger = container.querySelector('button, [role="button"]');
                const tooltip = container.querySelector('.tooltip');
                
                if (trigger && tooltip) {
                    // Make tooltip keyboard accessible
                    const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;
                    trigger.setAttribute('aria-describedby', tooltipId);
                    tooltip.id = tooltipId;
                    
                    // Show/hide tooltip function
                    const showTooltip = () => {
                        // Hide all other tooltips first
                        document.querySelectorAll('.tooltip').forEach(t => {
                            t.classList.remove('show');
                        });
                        tooltip.classList.add('show');
                    };
                    
                    const hideTooltip = () => {
                        tooltip.classList.remove('show');
                    };
                    
                    // Click handler for mobile/keyboard
                    trigger.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (tooltip.classList.contains('show')) {
                            hideTooltip();
                        } else {
                            showTooltip();
                        }
                    });
                    
                    // Mouse events for desktop
                    trigger.addEventListener('mouseenter', showTooltip);
                    container.addEventListener('mouseleave', hideTooltip);
                    
                    // Close on blur for accessibility
                    trigger.addEventListener('blur', () => {
                        setTimeout(() => {
                            if (!container.contains(document.activeElement)) {
                                hideTooltip();
                            }
                        }, 200);
                    });
                    
                    // Escape key to close
                    trigger.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape') {
                            hideTooltip();
                        }
                    });
                }
            });
        },

        setupAriaLive() {
            // Create a global aria-live region for announcements
            const liveRegion = document.createElement('div');
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.className = 'sr-only';
            liveRegion.id = 'aria-live-region';
            document.body.appendChild(liveRegion);
        },

        enhanceFocus() {
            // Enhance focus visibility for all interactive elements
            const focusableElements = document.querySelectorAll(
                'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
            );
            
            focusableElements.forEach(element => {
                element.addEventListener('focus', () => {
                    if (state.keyboardNav) {
                        element.classList.add('focus-visible');
                    }
                });
                
                element.addEventListener('blur', () => {
                    element.classList.remove('focus-visible');
                });
            });
        }
    };

    // Chart Manager
    const chartManager = {
        charts: {},
        
        init() {
            if (typeof Chart === 'undefined') {
                console.warn('Chart.js not loaded');
                return;
            }
            
            // Set default options for accessibility
            Chart.defaults.plugins.tooltip.enabled = true;
            Chart.defaults.plugins.legend.labels.generateLabels = function(chart) {
                const labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                labels.forEach(label => {
                    label.text = label.text || 'Data';
                });
                return labels;
            };
            
            this.createPerceptionChart();
            this.createCompetitorChart();
        },

        createPerceptionChart() {
            const ctx = document.getElementById('perceptionChart');
            if (!ctx) return;
            
            const isDark = state.theme === 'dark';
            
            this.charts.perception = new Chart(ctx.getContext('2d'), {
                type: 'radar',
                data: {
                    labels: ['Reclutador', 'Cliente', 'Partner', 'Inversor', 'Mentor'],
                    datasets: [{
                        label: 'Perception Score',
                        data: [85, 78, 92, 71, 88],
                        borderColor: isDark ? '#7c8ff3' : '#2952a3',
                        backgroundColor: isDark ? 'rgba(124, 143, 243, 0.2)' : 'rgba(41, 82, 163, 0.2)',
                        pointBackgroundColor: isDark ? '#7c8ff3' : '#2952a3',
                        pointBorderColor: isDark ? '#1a1a1a' : '#ffffff',
                        pointHoverBackgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                        pointHoverBorderColor: isDark ? '#7c8ff3' : '#2952a3',
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label + ': ' + context.raw + '%';
                                }
                            }
                        }
                    },
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                stepSize: 20,
                                color: isDark ? '#e0e0e0' : '#2d2d2d',
                                font: {
                                    size: 12
                                }
                            },
                            grid: {
                                color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                            },
                            angleLines: {
                                color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                            },
                            pointLabels: {
                                color: isDark ? '#e0e0e0' : '#2d2d2d',
                                font: {
                                    size: 12,
                                    weight: 500
                                }
                            }
                        }
                    }
                }
            });
        },

        createCompetitorChart() {
            const ctx = document.getElementById('competitorChart');
            if (!ctx) return;
            
            const isDark = state.theme === 'dark';
            
            this.charts.competitor = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Tu Perfil', 'Competidor A', 'Competidor B', 'Promedio'],
                    datasets: [{
                        label: 'Positioning Score',
                        data: [85, 65, 72, 58],
                        backgroundColor: [
                            isDark ? 'rgba(124, 143, 243, 0.8)' : 'rgba(41, 82, 163, 0.8)',
                            isDark ? 'rgba(184, 184, 184, 0.8)' : 'rgba(82, 82, 82, 0.8)',
                            isDark ? 'rgba(184, 184, 184, 0.8)' : 'rgba(82, 82, 82, 0.8)',
                            isDark ? 'rgba(184, 184, 184, 0.8)' : 'rgba(82, 82, 82, 0.8)'
                        ],
                        borderColor: [
                            isDark ? '#7c8ff3' : '#2952a3',
                            isDark ? '#b8b8b8' : '#525252',
                            isDark ? '#b8b8b8' : '#525252',
                            isDark ? '#b8b8b8' : '#525252'
                        ],
                        borderWidth: 2,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.label + ': ' + context.raw + '%';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                },
                                color: isDark ? '#e0e0e0' : '#2d2d2d',
                                font: {
                                    size: 12
                                }
                            },
                            grid: {
                                color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                            }
                        },
                        x: {
                            ticks: {
                                color: isDark ? '#e0e0e0' : '#2d2d2d',
                                font: {
                                    size: 12,
                                    weight: 500
                                }
                            },
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        },

        updateTheme() {
            // Update chart colors when theme changes
            if (this.charts.perception) {
                this.charts.perception.destroy();
                this.createPerceptionChart();
            }
            if (this.charts.competitor) {
                this.charts.competitor.destroy();
                this.createCompetitorChart();
            }
        }
    };

    // Event Handlers
    const eventHandlers = {
        init() {
            // Theme toggle
            elements.themeToggle = document.getElementById('themeToggle');
            if (elements.themeToggle) {
                elements.themeToggle.addEventListener('click', () => {
                    themeManager.toggle();
                    chartManager.updateTheme();
                });
            }
            
            // Language toggle
            elements.langToggle = document.getElementById('langToggle');
            if (elements.langToggle) {
                elements.langToggle.addEventListener('click', () => {
                    langManager.toggle();
                });
            }
            
            // Smooth scrolling for anchor links
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = anchor.getAttribute('href');
                    const target = document.querySelector(targetId);
                    
                    if (target) {
                        scrollManager.smoothScroll(target);
                        
                        // Update active nav state
                        document.querySelectorAll('.nav-link').forEach(link => {
                            link.classList.remove('active');
                        });
                        anchor.classList.add('active');
                    }
                });
            });
            
            // Button actions setup
            this.setupButtonActions();
            
            // Button ripple effect
            document.querySelectorAll('.btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    const ripple = document.createElement('span');
                    const rect = this.getBoundingClientRect();
                    const size = Math.max(rect.width, rect.height);
                    const x = e.clientX - rect.left - size / 2;
                    const y = e.clientY - rect.top - size / 2;
                    
                    ripple.style.width = ripple.style.height = size + 'px';
                    ripple.style.left = x + 'px';
                    ripple.style.top = y + 'px';
                    ripple.classList.add('ripple');
                    
                    this.appendChild(ripple);
                    
                    setTimeout(() => {
                        ripple.remove();
                    }, 600);
                });
            });
        },

        setupButtonActions() {
            // Get current language for messages
            const getCurrentLanguageMessages = () => {
                const isSpanish = state.language === 'es';
                return {
                    startFree: {
                        title: isSpanish ? '¡Próximamente!' : 'Coming Soon!',
                        message: isSpanish ? 'Estamos trabajando en esta funcionalidad. ¡Mantente atento!' : 'We are working on this feature. Stay tuned!'
                    },
                    watchDemo: {
                        title: isSpanish ? 'Demo en Desarrollo' : 'Demo in Development',
                        message: isSpanish ? 'Estamos preparando una demostración increíble. ¡Vuelve pronto!' : 'We are preparing an amazing demo. Come back soon!'
                    },
                    pricing: {
                        title: isSpanish ? 'Funcionalidad en Desarrollo' : 'Feature in Development',
                        message: isSpanish ? 'Los pagos y suscripciones estarán disponibles pronto.' : 'Payments and subscriptions will be available soon.'
                    },
                    avatar: {
                        title: isSpanish ? 'Avatares Profesionales' : 'Professional Avatars',
                        message: isSpanish ? 'Esta funcionalidad te permitirá crear diferentes versiones de tu portfolio según tu audiencia objetivo.' : 'This feature will allow you to create different versions of your portfolio according to your target audience.'
                    }
                };
            };

            // Hero section buttons
            const startFreeBtn = document.querySelector('button .fas.fa-rocket')?.closest('button');
            if (startFreeBtn) {
                startFreeBtn.addEventListener('click', () => {
                    const messages = getCurrentLanguageMessages();
                    siteUtils.showTempPopup(messages.startFree.title, messages.startFree.message);
                });
            }

            const watchDemoBtn = document.querySelector('button .fas.fa-play-circle')?.closest('button');
            if (watchDemoBtn) {
                watchDemoBtn.addEventListener('click', () => {
                    const messages = getCurrentLanguageMessages();
                    siteUtils.showTempPopup(messages.watchDemo.title, messages.watchDemo.message);
                });
            }

            // Professional avatars buttons
            document.querySelectorAll('[aria-describedby="client-desc"], [aria-describedby="recruiter-desc"], [aria-describedby="academic-desc"]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const messages = getCurrentLanguageMessages();
                    siteUtils.showTempPopup(messages.avatar.title, messages.avatar.message);
                });
            });

            // Pricing buttons
            document.querySelectorAll('.pricing-card .btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const messages = getCurrentLanguageMessages();
                    siteUtils.showTempPopup(messages.pricing.title, messages.pricing.message);
                });
            });

            // Social media links (for demo purposes)
            document.querySelectorAll('footer a[aria-label="Twitter"], footer a[aria-label="LinkedIn"], footer a[aria-label="Instagram"], footer a[aria-label="GitHub"]').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const isSpanish = state.language === 'es';
                    const platform = link.getAttribute('aria-label');
                    const title = isSpanish ? 'Redes Sociales' : 'Social Media';
                    const message = isSpanish ? 
                        `Síguenos en ${platform} para las últimas actualizaciones.` : 
                        `Follow us on ${platform} for the latest updates.`;
                    siteUtils.showTempPopup(title, message);
                });
            });
        }
    };

    // Performance Monitoring
    const performanceMonitor = {
        init() {
            if ('PerformanceObserver' in window) {
                // Monitor long tasks
                try {
                    const observer = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            console.warn('Long task detected:', entry.duration + 'ms');
                        }
                    });
                    observer.observe({ entryTypes: ['longtask'] });
                } catch (e) {
                    // Long task monitoring not supported
                }
            }
            
            // Log performance metrics
            window.addEventListener('load', () => {
                setTimeout(() => {
                    if ('performance' in window) {
                        const perfData = window.performance.timing;
                        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
                        console.log('Page load time:', pageLoadTime + 'ms');
                    }
                }, 0);
            });
        }
    };

    // Service Worker Registration
    const registerServiceWorker = async () => {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });
                console.log('Service Worker registered:', registration);
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New update available
                            utils.announce('New version available! Refresh to update.');
                        }
                    });
                });
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    };

    // Utility functions for site functionality
    const siteUtils = {
        updateCurrentYear() {
            const currentYearElement = document.getElementById('currentYear');
            if (currentYearElement) {
                currentYearElement.textContent = new Date().getFullYear();
            }
        },

        // Create and show a temporary popup
        showTempPopup(title, message, duration = 3000) {
            // Remove any existing popup
            const existingPopup = document.querySelector('.temp-popup');
            if (existingPopup) {
                existingPopup.remove();
            }

            // Create popup element
            const popup = document.createElement('div');
            popup.className = 'temp-popup';
            popup.innerHTML = `
                <div class="temp-popup-content">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <button class="temp-popup-close" aria-label="Close popup">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;

            // Add popup styles
            popup.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(8px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: popup-fade-in 0.3s ease;
                padding: 1rem;
            `;

            const content = popup.querySelector('.temp-popup-content');
            content.style.cssText = `
                background: var(--bg-elevated);
                color: var(--text-primary);
                padding: 2rem;
                border-radius: 1rem;
                max-width: 400px;
                width: 100%;
                box-shadow: var(--shadow-xl);
                border: 1px solid var(--border-primary);
                text-align: center;
                position: relative;
                animation: popup-scale-in 0.3s ease;
            `;

            content.querySelector('h3').style.cssText = `
                margin: 0 0 1rem 0;
                font-size: 1.25rem;
                font-weight: 600;
                color: var(--primary-color);
            `;

            content.querySelector('p').style.cssText = `
                margin: 0;
                line-height: 1.6;
                color: var(--text-secondary);
            `;

            const closeBtn = content.querySelector('.temp-popup-close');
            closeBtn.style.cssText = `
                position: absolute;
                top: 0.75rem;
                right: 0.75rem;
                background: none;
                border: none;
                color: var(--text-tertiary);
                cursor: pointer;
                font-size: 1.125rem;
                padding: 0.25rem;
                border-radius: 0.25rem;
                transition: color 0.2s ease;
            `;

            // Add CSS animation keyframes if not already added
            if (!document.querySelector('#popup-animations')) {
                const style = document.createElement('style');
                style.id = 'popup-animations';
                style.textContent = `
                    @keyframes popup-fade-in {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes popup-scale-in {
                        from { transform: scale(0.9); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                    @keyframes popup-fade-out {
                        from { opacity: 1; }
                        to { opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }

            // Close popup function
            const closePopup = () => {
                popup.style.animation = 'popup-fade-out 0.2s ease';
                setTimeout(() => {
                    if (popup.parentNode) {
                        popup.remove();
                    }
                }, 200);
            };

            // Event listeners
            closeBtn.addEventListener('click', closePopup);
            popup.addEventListener('click', (e) => {
                if (e.target === popup) {
                    closePopup();
                }
            });

            // Escape key to close
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    closePopup();
                    document.removeEventListener('keydown', escapeHandler);
                }
            };
            document.addEventListener('keydown', escapeHandler);

            // Add to DOM
            document.body.appendChild(popup);

            // Auto-close after duration
            if (duration > 0) {
                setTimeout(closePopup, duration);
            }

            // Focus management for accessibility
            closeBtn.focus();

            return popup;
        }
    };

    // Initialize everything
    const init = () => {
        // Cache DOM elements
        elements.progressBar = document.getElementById('progressBar');
        elements.nav = document.querySelector('.nav, nav');
        
        // Initialize managers
        themeManager.init();
        langManager.init();
        scrollManager.init();
        animationManager.init();
        a11yManager.init();
        eventHandlers.init();
        performanceMonitor.init();
        
        // Update current year
        siteUtils.updateCurrentYear();
        
        // Register service worker
        registerServiceWorker();
        
        // Initialize charts after a small delay
        setTimeout(() => {
            chartManager.init();
        }, 100);
        
        // Mark initialization complete
        document.body.classList.add('js-loaded');
    };

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose API for external use
    window.Prismafolio = {
        theme: {
            set: (theme) => themeManager.apply(theme),
            toggle: () => themeManager.toggle(),
            get: () => state.theme
        },
        language: {
            set: (lang) => langManager.apply(lang),
            toggle: () => langManager.toggle(),
            get: () => state.language
        },
        announce: utils.announce
    };

})();