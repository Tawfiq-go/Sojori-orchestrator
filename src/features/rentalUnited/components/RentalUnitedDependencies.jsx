import { useEffect } from 'react';
const RentalUnitedDependencies = () => {
  useEffect(() => {
    const addDependency = (tag, attributes, id) => {
      if (!document.getElementById(id)) {
        const element = document.createElement(tag);
        Object.keys(attributes).forEach(key => {
          element.setAttribute(key, attributes[key]);
        });
        element.id = id;
        document.head.appendChild(element);
      }
    };
    addDependency('script', {
      src: 'https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js'
    }, 'jquery-rental-united');
    addDependency('link', {
      rel: 'stylesheet',
      href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.6.3/css/font-awesome.min.css'
    }, 'font-awesome-rental-united');
    const loadScopedBootstrap = async () => {
      try {
        const response = await fetch('https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css');
        const css = await response.text();
        const scopedCSS = css.replace(/([^{}]+){/g, (match, selector) => {
          if (selector.trim().startsWith('@')) {
            return match;
          }
          const selectors = selector.split(',').map(s => {
            const trimmed = s.trim();
            if (trimmed.startsWith('html') || trimmed.startsWith('body')) {
              return `#ruApp ${trimmed.replace(/^(html|body)/, '')}`.trim();
            }
            return `#ruApp ${trimmed}`;
          }).join(', ');
          return `${selectors} {`;
        });
        const customStyles = `
          ${scopedCSS}
          
          /* Additional custom styles */
          #ruApp .connected-channels-container {
            box-shadow: none !important;
            -webkit-box-shadow: none !important;
            -moz-box-shadow: none !important;
          }
          
          /* Reset any potential conflicts */
          #ruApp * {
            box-sizing: border-box;
          }
        `;
        addDependency('style', {}, 'rental-united-scoped-bootstrap');
        const styleElement = document.getElementById('rental-united-scoped-bootstrap');
        if (styleElement) {
          styleElement.textContent = customStyles;
        }
      } catch (error) {
        const fallbackCSS = `
          #ruApp .connected-channels-container {
            box-shadow: none !important;
            -webkit-box-shadow: none !important;
            -moz-box-shadow: none !important;
          }
        `;
        addDependency('link', {
          rel: 'stylesheet',
          href: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css',
          integrity: 'sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u',
          crossorigin: 'anonymous'
        }, 'bootstrap-css-rental-united-fallback');
        addDependency('style', {}, 'rental-united-fallback-styles');
        const fallbackStyleElement = document.getElementById('rental-united-fallback-styles');
        if (fallbackStyleElement) {
          fallbackStyleElement.textContent = fallbackCSS;
        }
      }
    };
    loadScopedBootstrap();
    return () => {
      const dependenciesToRemove = ['jquery-rental-united', 'font-awesome-rental-united', 'rental-united-scoped-bootstrap', 'bootstrap-css-rental-united-fallback', 'rental-united-fallback-styles'];
      dependenciesToRemove.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          element.remove();
        }
      });
    };
  }, []);
  return null;
};
export default RentalUnitedDependencies;
