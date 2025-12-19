import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/footer.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { name: 'Find Parking', path: '/parking' },
      { name: 'For Owners', path: '/owner-info' },
      { name: 'For Renters', path: '/rental-info' },
      { name: 'Mobile App', path: '/app' }
    ],
    company: [
      { name: 'About Us', path: '/about' },
      { name: 'Contact', path: '/contact' },
      { name: 'Careers', path: '/careers' },
      { name: 'Press', path: '/press' }
    ],
    support: [
      { name: 'Help Center', path: '/help' },
      { name: 'Safety', path: '/safety' },
      { name: 'Community', path: '/community' },
      { name: 'API', path: '/api' }
    ],
    legal: [
      { name: 'Privacy Policy', path: '/privacy' },
      { name: 'Terms of Service', path: '/terms' },
      { name: 'Cookie Policy', path: '/cookies' },
      { name: 'Accessibility', path: '/accessibility' }
    ]
  };

  const socialLinks = [
    { name: 'Twitter', icon: '𝕏', url: '#', color: '#1DA1F2' },
    { name: 'Facebook', icon: '📘', url: '#', color: '#4267B2' },
    { name: 'LinkedIn', icon: '💼', url: '#', color: '#0077B5' },
    { name: 'Instagram', icon: '📷', url: '#', color: '#E4405F' }
  ];

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Main Footer Content */}
        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <div className="logo-icon">P</div>
              <span className="logo-text">ParkSmart</span>
            </Link>
            <p className="footer-description">
              The smart way to find, book, and manage parking spaces. 
              Connecting drivers with property owners for seamless parking solutions.
            </p>
            <div className="social-links">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.url}
                  className="social-link"
                  title={social.name}
                  style={{ '--social-color': social.color }}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span className="social-icon">{social.icon}</span>
                  <span className="social-name">{social.name}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="footer-links">
            <div className="link-group">
              <h3 className="link-group-title">Product</h3>
              <ul className="link-list">
                {footerLinks.product.map((link, index) => (
                  <li key={index}>
                    <Link to={link.path} className="footer-link">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="link-group">
              <h3 className="link-group-title">Company</h3>
              <ul className="link-list">
                {footerLinks.company.map((link, index) => (
                  <li key={index}>
                    <Link to={link.path} className="footer-link">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="link-group">
              <h3 className="link-group-title">Support</h3>
              <ul className="link-list">
                {footerLinks.support.map((link, index) => (
                  <li key={index}>
                    <Link to={link.path} className="footer-link">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="link-group">
              <h3 className="link-group-title">Legal</h3>
              <ul className="link-list">
                {footerLinks.legal.map((link, index) => (
                  <li key={index}>
                    <Link to={link.path} className="footer-link">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="footer-newsletter">
            <h3 className="newsletter-title">Stay Updated</h3>
            <p className="newsletter-description">
              Get the latest updates about new features and parking deals.
            </p>
            <div className="newsletter-form">
              <input
                type="email"
                placeholder="Enter your email"
                className="newsletter-input"
              />
              <button className="newsletter-button">
                <span>Subscribe</span>
                <span className="button-icon">→</span>
              </button>
            </div>
            <div className="trust-badges">
              <div className="trust-badge">
                <span className="badge-icon">🔒</span>
                <span className="badge-text">Secure</span>
              </div>
              <div className="trust-badge">
                <span className="badge-icon">⚡</span>
                <span className="badge-text">Fast</span>
              </div>
              <div className="trust-badge">
                <span className="badge-icon">✨</span>
                <span className="badge-text">Reliable</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p className="copyright">
              © {currentYear} ParkSmart. All rights reserved. Built with ❤️ for better parking.
            </p>
            <div className="footer-bottom-links">
              <span className="status-indicator">
                <span className="status-dot"></span>
                All systems operational
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Background Effects */}
      <div className="footer-bg-effects">
        <div className="bg-gradient"></div>
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>
    </footer>
  );
}