import React from 'react';
import '../styles/about.css';
import '../styles/home.css';

export default function About() {
  return (
    <div className="about-page home-container">
      {/* Hero Section - use Home hero classes for consistent look */}
      <section className="hero-section about-hero">
        <div className="hero-content">
          <div className="hero-text about-hero-content">
            <h1 className="hero-title">About <span className="gradient-text">ParkEasy</span></h1>
            <p className="hero-subtitle about-subtitle">
              Revolutionizing parking solutions through technology, connecting people with 
              perfect parking spots anytime, anywhere.
            </p>
          </div>

          <div className="hero-visual">
            <img
              src="https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&w=1200&q=80"
              alt="Smart parking illustration"
              className="hero-image"
            />
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="mission-section">
        <div className="container">
          <div className="mission-content">
            <div className="mission-text">
              <h2 className="section-title">Our Mission</h2>
              <p className="mission-description">
                At ParkEasy, we believe that finding parking shouldn't be a stressful experience. 
                Our mission is to create a seamless, efficient, and user-friendly platform that 
                connects drivers with available parking spaces in real-time.
              </p>
              <p className="mission-description">
                We're building a community where property owners can monetize their unused spaces 
                while providing drivers with convenient, affordable parking solutions.
              </p>
            </div>
            <div className="mission-image">
              <div className="mission-card">
                <div className="card-icon">🎯</div>
                <h3>Our Vision</h3>
                <p>To eliminate parking stress and create smarter cities through technology</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="values-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Our Values</h2>
            <p className="section-description">
              The principles that guide everything we do
            </p>
          </div>
          
          <div className="values-grid">
            <div className="value-card">
              <div className="value-icon">🚀</div>
              <h3>Innovation</h3>
              <p>We continuously innovate to provide cutting-edge parking solutions that make urban mobility easier and more efficient.</p>
            </div>
            
            <div className="value-card">
              <div className="value-icon">🤝</div>
              <h3>Trust</h3>
              <p>We build trust through transparency, security, and reliability in every transaction and interaction on our platform.</p>
            </div>
            
            <div className="value-card">
              <div className="value-icon">🌟</div>
              <h3>Excellence</h3>
              <p>We strive for excellence in user experience, customer service, and product quality to exceed expectations.</p>
            </div>
            
            <div className="value-card">
              <div className="value-icon">🌍</div>
              <h3>Sustainability</h3>
              <p>We promote sustainable urban development by optimizing parking space utilization and reducing traffic congestion.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="team-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Meet Our Team</h2>
            <p className="section-description">
              The passionate people behind ParkEasy
            </p>
          </div>
          
          <div className="team-grid">
            <div className="team-card">
              <div className="team-avatar">
                <div className="avatar-placeholder">JD</div>
              </div>
              <div className="team-info">
                <h3>John Doe</h3>
                <p className="team-role">CEO & Founder</p>
                <p className="team-bio">
                  Visionary leader with 10+ years in tech, passionate about solving urban mobility challenges.
                </p>
              </div>
            </div>
            
            <div className="team-card">
              <div className="team-avatar">
                <div className="avatar-placeholder">JS</div>
              </div>
              <div className="team-info">
                <h3>Jane Smith</h3>
                <p className="team-role">CTO</p>
                <p className="team-bio">
                  Tech expert specializing in scalable systems and user experience design.
                </p>
              </div>
            </div>
            
            <div className="team-card">
              <div className="team-avatar">
                <div className="avatar-placeholder">MJ</div>
              </div>
              <div className="team-info">
                <h3>Mike Johnson</h3>
                <p className="team-role">Head of Operations</p>
                <p className="team-bio">
                  Operations specialist ensuring smooth platform functionality and customer satisfaction.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="story-section">
        <div className="container">
          <div className="story-content">
            <div className="story-text">
              <h2 className="section-title">Our Story</h2>
              <div className="story-timeline">
                <div className="timeline-item">
                  <div className="timeline-year">2023</div>
                  <div className="timeline-content">
                    <h3>The Beginning</h3>
                    <p>Founded with a simple idea: make parking hassle-free for everyone.</p>
                  </div>
                </div>
                
                <div className="timeline-item">
                  <div className="timeline-year">2024</div>
                  <div className="timeline-content">
                    <h3>Growth & Innovation</h3>
                    <p>Expanded to multiple cities and introduced advanced features like real-time booking and navigation.</p>
                  </div>
                </div>
                
                <div className="timeline-item">
                  <div className="timeline-year">2025</div>
                  <div className="timeline-content">
                    <h3>The Future</h3>
                    <p>Continuing to innovate with AI-powered recommendations and smart city integrations.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="story-stats">
              <div className="stat-item">
                <div className="stat-number">10K+</div>
                <div className="stat-label">Happy Users</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">500+</div>
                <div className="stat-label">Parking Partners</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">50+</div>
                <div className="stat-label">Cities Served</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">99.9%</div>
                <div className="stat-label">Uptime</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="about-cta">
        <div className="container">
          <div className="cta-content">
            <h2>Join Our Journey</h2>
            <p>
              Ready to be part of the parking revolution? Whether you're looking for convenient 
              parking or want to monetize your space, we're here to help.
            </p>
            <div className="cta-buttons">
              <a href="/register" className="btn btn-primary">Get Started Today</a>
              <a href="/contact" className="btn btn-outline">Contact Us</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}