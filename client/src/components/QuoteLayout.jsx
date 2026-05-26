import { Link } from "react-router-dom";
import { PawPrint, Phone } from "lucide-react";
import "../styles/QuoteLayout.css";

function QuoteLayout({ children, activeStep = 1 }) {
  const steps = ["Pet Info", "Select Plan", "Your Information", "Thank You"];

  return (
    <div className="quote-page">
      <header className="quote-header">
        <Link to="/" className="quote-logo">
          <PawPrint />
          <div>
            <h2>PetsBest</h2>
            <p>Pet Health Insurance</p>
          </div>
        </Link>

        <a className="quote-phone" href="tel:8006608726">
          <Phone size={18} />
          <span>(800) 660-8726</span>
        </a>
      </header>

      <div className="quote-stepper">
        {steps.map((step, index) => (
          <div className="quote-step" key={step}>
            <span>{step}</span>
            <b className={activeStep >= index + 1 ? "active" : ""}></b>
          </div>
        ))}
      </div>

      {children}
    </div>
  );
}

export default QuoteLayout;