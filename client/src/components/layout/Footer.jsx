import React from 'react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="gov-footer">
      <p>© {new Date().getFullYear()} Department of Consumer Affairs — Legal Metrology Division, Government of India</p>
      <p>Content owned and maintained by National Informatics Centre (NIC) | Website designed under GIGW guidelines</p>
    </footer>
  );
}
