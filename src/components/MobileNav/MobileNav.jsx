import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

/**
 * Mobile Navigation Component
 * Hamburger menu for mobile devices with smooth animations
 */
export const MobileNav = ({ 
  topics = [], 
  activeTopic = '', 
  onTopicSelect = () => {},
  onLinkClick = () => {}
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleTopicSelect = (topicId) => {
    onTopicSelect(topicId);
    closeMenu();
  };

  const handleLinkClick = (link) => {
    onLinkClick(link);
    closeMenu();
  };

  const menuVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05,
      }
    },
    exit: { 
      opacity: 0, 
      y: -20,
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
      }
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="mobile-nav show-mobile">
      {/* Hamburger button */}
      <button
        className="mobile-nav-toggle"
        onClick={toggleMenu}
        aria-label="Toggle navigation menu"
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Menu overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="mobile-nav-overlay"
            onClick={closeMenu}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Menu content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="mobile-nav-menu"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={menuVariants}
          >
            <nav className="mobile-nav-list">
              <motion.div variants={itemVariants} className="mobile-nav-section">
                <h3 className="mobile-nav-heading">Topics</h3>
                {topics.map((topic) => (
                  <motion.button
                    key={topic.id}
                    onClick={() => handleTopicSelect(topic.id)}
                    className={`mobile-nav-item ${activeTopic === topic.id ? 'active' : ''}`}
                    variants={itemVariants}
                  >
                    {topic.name}
                  </motion.button>
                ))}
              </motion.div>

              <motion.div variants={itemVariants} className="mobile-nav-section">
                <h3 className="mobile-nav-heading">Resources</h3>
                <motion.a
                  href="https://kubernetes.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mobile-nav-item"
                  variants={itemVariants}
                  onClick={() => handleLinkClick('kubernetes')}
                >
                  Kubernetes Docs
                </motion.a>
                <motion.a
                  href="https://docs.docker.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mobile-nav-item"
                  variants={itemVariants}
                  onClick={() => handleLinkClick('docker')}
                >
                  Docker Docs
                </motion.a>
                <motion.a
                  href="https://github.com/anaskmh/anatomyof-k8s"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mobile-nav-item"
                  variants={itemVariants}
                  onClick={() => handleLinkClick('github')}
                >
                  GitHub
                </motion.a>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .mobile-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 900;
        }

        .mobile-nav-toggle {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 1000;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .mobile-nav-toggle:active {
          transform: scale(0.95);
        }

        .mobile-nav-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 901;
        }

        .mobile-nav-menu {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          z-index: 902;
          overflow-y: auto;
          padding-top: 5rem;
          padding-bottom: 2rem;
          -webkit-overflow-scrolling: touch;
        }

        .mobile-nav-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .mobile-nav-section {
          padding: 1.5rem 1rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .mobile-nav-heading {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 1rem 0;
          padding: 0;
        }

        .mobile-nav-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 0.75rem 0;
          border: none;
          background: none;
          color: #1f2937;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .mobile-nav-item:active {
          transform: scale(0.98);
        }

        .mobile-nav-item.active {
          color: #326ce5;
          font-weight: 600;
        }

        .mobile-nav-item:not(.active):hover {
          color: #4b5563;
          padding-left: 0.5rem;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .mobile-nav-toggle {
            background: #1f2937;
            border-color: #374151;
            color: #fff;
          }

          .mobile-nav-menu {
            background: #111827;
          }

          .mobile-nav-section {
            border-bottom-color: #374151;
          }

          .mobile-nav-heading {
            color: #9ca3af;
          }

          .mobile-nav-item {
            color: #f3f4f6;
          }

          .mobile-nav-item:not(.active):hover {
            color: #d1d5db;
          }
        }

        /* Reduce motion support */
        @media (prefers-reduced-motion: reduce) {
          .mobile-nav-toggle,
          .mobile-nav-item {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
};

export default MobileNav;
