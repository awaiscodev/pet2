import { CheckCircle, Home } from "lucide-react";
import { Link } from "react-router-dom";
import QuoteLayout from "../components/QuoteLayout";
import "../styles/Success.css";

function Success() {
  return (
    <QuoteLayout activeStep={4}>
      <main className="success-wrap">
        <section className="success-card">
          <CheckCircle className="success-icon" />

          <h1>Thank You!</h1>
          <p>
            Your information has been submitted successfully. Our team will
            contact you shortly.
          </p>

          <Link to="/" className="home-btn">
            <Home size={18} />
            Back to Home
          </Link>
        </section>
      </main>
    </QuoteLayout>
  );
}

export default Success;