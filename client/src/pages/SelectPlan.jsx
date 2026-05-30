import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import QuoteLayout from "../components/QuoteLayout";
import "../styles/SelectPlan.css";
import api from "../api";

const plans = [
  {
    id: "promo",
    name: "Starter Promo Plan",
    price: 0,
    badge: "Limited Promotion",
    description:
      "A free promotional plan for new pet parents with basic digital support and accident guidance.",
    features: [
      "No monthly fee",
      "Basic accident support",
      "Digital policy record",
      "Simple claim guidance",
    ],
  },
  {
    id: "care",
    name: "Essential Care Plan",
    price: 0.99,
    badge: "Recommended",
    description:
      "A low-cost plan with accident, illness, and pet care support for only $0.99 per month.",
    features: [
      "Accident & illness support",
      "Vet visit guidance",
      "24/7 pet support access",
      "Digital claim process",
    ],
  },
];

function SelectPlan() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const choosePlan = (plan) => {
    setLoading(true);
    setError("");

    localStorage.setItem("selectedPlan", JSON.stringify(plan));

    setTimeout(() => {
      navigate("/personal-info");
    }, 1000);

    const uniqueId = localStorage.getItem("uniqueId");

    if (!uniqueId) {
      console.log("Pet info missing. Plan will not save yet.");
      return;
    }

    api
      .post("/update-lead", {
        uniqueId,
        planName: plan.name,
        amount: plan.price.toFixed(2),
      })
      .catch((err) => {
        console.log(
          "Plan save failed:",
          err.response?.data?.message || err.message || err
        );
      });
  };

  return (
    <QuoteLayout activeStep={2}>
      {loading && (
        <div className="page-loader">
          <div className="loader-box">
            <div className="loader-spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      )}

      <main className="plan-wrap">
        <div className="plan-heading">
          <h1>Select Your Pet Insurance Plan</h1>
          <p>Choose one plan to continue.</p>
          {error && <p className="field-error-text">{error}</p>}
        </div>

        <div className="plans-grid">
          {plans.map((plan) => (
            <div
              className={
                plan.id === "care" ? "plan-card featured-plan" : "plan-card"
              }
              key={plan.id}
            >
              <div className="plan-badge">
                <Sparkles size={16} />
                {plan.badge}
              </div>

              <div className="plan-icon">
                {plan.id === "promo" ? <ShieldCheck /> : <Stethoscope />}
              </div>

              <h2>{plan.name}</h2>
              <p className="plan-desc">{plan.description}</p>

              <div className="plan-price">
                ${plan.price.toFixed(2)}
                <span>/ month</span>
              </div>

              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <BadgeCheck size={18} />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => choosePlan(plan)}
                disabled={loading}
              >
                Select Plan
              </button>
            </div>
          ))}
        </div>
      </main>
    </QuoteLayout>
  );
}

export default SelectPlan;