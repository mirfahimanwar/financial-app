
import * as React from "react";
import { useState } from "react";

interface NavbarProps {
  user?: { name: string };
}

const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>Anwar Innovations</div>

      <ul style={styles.navLinks}>
        <li>
          <a href="/" style={styles.link}>Home</a>
        </li>

        {/* Dropdown */}
        <li
          style={styles.dropdown}
          onMouseEnter={() => setDropdownOpen(true)}
          onMouseLeave={() => setDropdownOpen(false)}
        >
          <span style={styles.link}>Pages</span>
          {dropdownOpen && (
            <ul style={styles.dropdownMenu}>
              <li><a href="/about" style={styles.dropdownLink}>About</a></li>
              <li><a href="/services" style={styles.dropdownLink}>Services</a></li>
              <li><a href="/contact" style={styles.dropdownLink}>Contact</a></li>
              <li><a href="/mortgage-calculator" style={styles.dropdownLink}>Mortgage Calculator</a></li>
            </ul>
          )}
        </li>

        {/* Conditional user links */}
        {!user ? (
          <>
            <li><a href="/login" style={styles.link}>Login</a></li>
            <li><a href="/register" style={styles.link}>Register</a></li>
          </>
        ) : (
          <li style={styles.user}>Welcome, {user.name}</li>
        )}
      </ul>
    </nav>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#222",
    padding: "0 2rem",
    height: "60px",
    color: "#fff",
    width: "100%",
  },
  logo: {
    fontWeight: "bold",
    fontSize: "1.5rem",
  },
  navLinks: {
    listStyle: "none",
    display: "flex",
    alignItems: "center",
    gap: "2rem",
    margin: 0,
    padding: 0,
  },
  link: {
    color: "#fff",
    textDecoration: "none",
    cursor: "pointer",
    padding: "8px 12px",
    borderRadius: "4px",
    transition: "background 0.2s",
  },
  dropdown: {
    position: "relative",
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    backgroundColor: "#333",
    minWidth: "150px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    borderRadius: "4px",
    marginTop: "8px",
    zIndex: 1000,
  },
  dropdownLink: {
    display: "block",
    color: "#fff",
    textDecoration: "none",
    padding: "10px 16px",
    borderRadius: "4px",
    transition: "background 0.2s",
  },
  user: {
    color: "#ccc",
    fontStyle: "italic",
  },
};

// Hover styles (using JS because inline styles can’t do :hover)
const addHoverStyles = () => {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    a:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    li ul li a:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `;
  document.head.appendChild(styleSheet);
};
addHoverStyles();

export default Navbar;
