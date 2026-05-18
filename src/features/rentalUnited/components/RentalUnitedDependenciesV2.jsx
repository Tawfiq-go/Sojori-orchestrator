import { useEffect } from 'react';

const RentalUnitedDependenciesV2 = ({ useIframe = false }) => {
  useEffect(() => {
    if (useIframe) {
      const customStyles = `
        .rental-united-iframe-container {
          background: white;
          border-radius: 8px;
          overflow: hidden;
        }
      `;

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

      addDependency('style', {}, 'rental-united-iframe-styles');
      const styleElement = document.getElementById('rental-united-iframe-styles');
      if (styleElement) {
        styleElement.textContent = customStyles;
      }

      return () => {
        const element = document.getElementById('rental-united-iframe-styles');
        if (element) {
          element.remove();
        }
      };
    }

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
      href: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css',
      integrity: 'sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u',
      crossorigin: 'anonymous'
    }, 'bootstrap-css-rental-united');

    addDependency('link', {
      rel: 'stylesheet',
      href: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap-theme.min.css',
      integrity: 'sha384-rHyoN1iRsVXV4nD0JutlnGaslCJuC7uwjduW9SVrLvRYooPp2bWYgmgJQIXwl/Sp',
      crossorigin: 'anonymous'
    }, 'bootstrap-theme-rental-united');

    addDependency('link', {
      rel: 'stylesheet',
      href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.6.3/css/font-awesome.min.css'
    }, 'font-awesome-rental-united');

    const customStyles = `
      .connected-channels-container {
        box-shadow: none !important;
        -webkit-box-shadow: none !important;
        -moz-box-shadow: none !important;
      }
    `;

    addDependency('style', {}, 'rental-united-custom-styles');
    const styleElement = document.getElementById('rental-united-custom-styles');
    if (styleElement) {
      styleElement.textContent = customStyles;
    }

    addDependency('script', {
      src: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js',
      integrity: 'sha384-Tc5IQib027qvyjSMfHjOMaLkfuWVxZxUPnCJA7l2mCWNIpG9mGCD8wGNIcPD7Txa',
      crossorigin: 'anonymous'
    }, 'bootstrap-js-rental-united');

    return () => {
      const dependenciesToRemove = [
        'jquery-rental-united',
        'bootstrap-css-rental-united',
        'bootstrap-theme-rental-united',
        'font-awesome-rental-united',
        'bootstrap-js-rental-united',
        'rental-united-custom-styles'
      ];

      dependenciesToRemove.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          element.remove();
        }
      });
    };
  }, [useIframe]);

  return null;
};

export default RentalUnitedDependenciesV2;
