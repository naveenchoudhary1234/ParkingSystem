import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/home.css';

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    // Trigger animations on load
    setAnimationClass('animate-fade-in');
    
    // Add scroll-based animations
    const handleScroll = () => {
      const elements = document.querySelectorAll('.feature-card, .testimonial-card');
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 100) {
          el.classList.add('animate-slide-up');
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const testimonials = [
    {
      quote: "ParkSmart has completely revolutionized how I manage my parking spaces. The platform is incredibly intuitive, and I've seen a 40% increase in bookings since joining. The automated payment system saves me hours each week!",
      author: "Sarah Johnson",
      role: "Property Owner & Entrepreneur",
      avatar: "SJ",
      rating: 5
    },
    {
      quote: "As someone who travels frequently for work, finding reliable parking used to be a nightmare. Now with ParkSmart, I can book spots in advance and never worry about being late to meetings. Game changer!",
      author: "Michael Chen",
      role: "Business Consultant",
      avatar: "MC",
      rating: 5
    },
    {
      quote: "Managing 50+ properties became effortless with ParkSmart. The rental dashboard gives me complete oversight, and the approval system ensures quality control. My clients love the seamless experience.",
      author: "Emma Rodriguez",
      role: "Property Management Director",
      avatar: "ER",
      rating: 5
    }
  ];

  const features = [
    {
      icon: "🎯",
      title: "Smart Location Matching",
      description: "Our AI-powered algorithm finds the perfect parking spots based on your destination, preferences, and real-time availability."
    },
    {
      icon: "⚡", 
      title: "Instant Booking & Confirmation",
      description: "Book your spot in under 30 seconds with instant confirmation and QR code access for seamless entry."
    },
    {
      icon: "�",
      title: "Secure Payment Processing", 
      description: "Enterprise-grade security with multiple payment options including digital wallets, cards, and contactless payments."
    },
    {
      icon: "📱",
      title: "Mobile-First Experience",
      description: "Native mobile app with offline capabilities, GPS navigation, and push notifications for the ultimate convenience."
    },
    {
      icon: "�",
      title: "Dynamic Pricing & Rewards",
      description: "Smart pricing based on demand with loyalty rewards, referral bonuses, and exclusive member discounts."
    },
    {
      icon: "�️",
      title: "24/7 Support & Insurance",
      description: "Round-the-clock customer support with comprehensive insurance coverage and dispute resolution."
    }
  ];

  return (
    <div className={`home-container ${animationClass}`}>
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              The Future of <span className="gradient-text">Smart Parking</span> is Here
            </h1>
            <p className="hero-subtitle">
              Experience seamless parking solutions powered by advanced technology. 
              Connect property owners with users through our intelligent platform for effortless, 
              secure, and profitable parking management.
            </p>
            <div className="hero-buttons">
              {isAuthenticated ? (
                <>
                  {user?.role === 'user' && (
                    <Link to="/parking" className="hero-btn hero-btn-primary">
                      🚗 Discover Parking Spots
                    </Link>
                  )}
                  {user?.role === 'rental' && (
                    <Link to="/rental-dashboard" className="hero-btn hero-btn-primary">
                      � Access Dashboard
                    </Link>
                  )}
                  {user?.role === 'owner' && (
                    <Link to="/owner-dashboard" className="hero-btn hero-btn-primary">
                      🏢 Manage Properties
                    </Link>
                  )}
                  <Link to="/about" className="hero-btn hero-btn-secondary">
                    Learn More
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="hero-btn hero-btn-primary">
                    🚀 Start Free Trial
                  </Link>
                  <Link to="/login" className="hero-btn hero-btn-secondary">
                    Sign In
                  </Link>
                </>
              )}
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">2,500+</span>
                <span className="stat-label">Active Properties</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">15,000+</span>
                <span className="stat-label">Happy Users</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">99.8%</span>
                <span className="stat-label">Uptime Guarantee</span>
              </div>
            </div>
          </div>
          
          <div className="hero-visual">
            <div className="hero-dashboard">
              <div className="dashboard-header">
                <h3 className="dashboard-title">Smart Dashboard</h3>
                <p className="dashboard-subtitle">Real-time parking management</p>
              </div>
              <div className="dashboard-content">
                <div className="dashboard-card">
                  <h4>📈 Revenue Analytics</h4>
                  <p>Track your earnings with detailed insights and forecasting</p>
                </div>
                <div className="dashboard-card">
                  <h4>� Booking Management</h4>
                  <p>Streamlined reservation system with instant notifications</p>
                </div>
                <div className="dashboard-card">
                  <h4>⚡ Quick Actions</h4>
                  <p>One-click property management and user communication</p>
                </div>
              </div>
            </div>
            <div className="floating-elements">
              <div className="floating-card">
                <div className="floating-card-icon">🚗</div>
                <h4>Quick Booking</h4>
                <p>Reserve premium spots in under 30 seconds</p>
              </div>
              <div className="floating-card">
                <div className="floating-card-icon">�</div>
                <h4>Premium Locations</h4>
                <p>Access exclusive parking in prime areas</p>
              </div>
              <div className="floating-card">
                <div className="floating-card-icon">�</div>
                <h4>Secure & Safe</h4>
                <p>End-to-end encryption with verified properties</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <div className="section-header">
            <h2 className="section-title">Why Choose ParkSmart?</h2>
            <p className="section-subtitle">
              Experience the next generation of parking solutions with cutting-edge technology, 
              unmatched convenience, and industry-leading security features.
            </p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card hover-lift">
                <div className="feature-icon">
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="testimonials-container">
          <div className="testimonials-header">
            <h2 className="testimonials-title">Trusted by Thousands</h2>
            <p className="testimonials-subtitle">
              Join the growing community of property owners and users who have transformed 
              their parking experience with ParkSmart.
            </p>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="testimonial-card hover-lift">
                <div className="testimonial-quote">
                  {testimonial.quote}
                </div>
                <div className="testimonial-author">
                  <div className="author-avatar">
                    {testimonial.avatar}
                  </div>
                  <div className="author-info">
                    <h4>{testimonial.author}</h4>
                    <p>{testimonial.role}</p>
                    <div className="rating">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <span key={i} className="star">★</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Ready to Transform Your Parking Experience?</h2>
          <p className="cta-description">
            Join over 15,000 satisfied users who have revolutionized their approach to parking. 
            Get started today with our free trial and discover the difference smart technology makes.
          </p>
          {!isAuthenticated && (
            <Link to="/register" className="cta-button hover-glow">
              Start Your Free Trial
              <span>→</span>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}