import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QuoteLayout from "../components/QuoteLayout";
import "../styles/PersonalInfo.css";
import api from "../api";

const states = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

function PersonalInfo() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    ssn: "",
    address: "",
    apartment: "",
    city: "",
    state: "",
    zipCode: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });

    const petInfo = JSON.parse(localStorage.getItem("petInfo")) || {};

    if (petInfo?.zipCode) {
      setForm((oldForm) => ({
        ...oldForm,
        zipCode: petInfo.zipCode,
      }));
    }
  }, []);

  const onlyText = (value) => value.replace(/[^a-zA-Z\s]/g, "");

  const updateField = (name, value) => {
    setForm({ ...form, [name]: value });
    setErrors((oldErrors) => ({ ...oldErrors, [name]: "" }));
  };

  const formatSSN = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 9);

    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;

    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  };

  const getAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  const validateForm = () => {
    const newErrors = {};

    const required = [
      "firstName",
      "lastName",
      "dob",
      "ssn",
      "address",
      "city",
      "state",
      "zipCode",
    ];

    required.forEach((field) => {
      if (!form[field]) {
        newErrors[field] = "Required";
      }
    });

    if (form.ssn && form.ssn.replace(/\D/g, "").length < 9) {
      newErrors.ssn = "SSN must be XXX-XX-XXXX";
    }

    if (form.zipCode && form.zipCode.replace(/\D/g, "").length < 5) {
      newErrors.zipCode = "Zip code must be 5 digits";
    }

    if (form.dob) {
      const selectedDate = new Date(form.dob);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        newErrors.dob = "DOB cannot be future date";
      } else if (getAge(form.dob) < 15) {
        newErrors.dob = "You must be at least 15 years old";
      }
    }

    return newErrors;
  };

  const handleNext = async (e) => {
    e.preventDefault();

    const newErrors = validateForm();

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const uniqueId = localStorage.getItem("uniqueId");
      const petInfo = JSON.parse(localStorage.getItem("petInfo")) || {};
      const selectedPlan =
        JSON.parse(localStorage.getItem("selectedPlan")) ||
        JSON.parse(localStorage.getItem("planInfo")) ||
        {};

      if (!uniqueId) {
        throw new Error("Pet info missing. Please start again.");
      }

      if (!petInfo.email) {
        throw new Error("User email missing. Please start again.");
      }

      localStorage.setItem("personalInfo", JSON.stringify(form));

      await api.post("/update-lead", {
        uniqueId,
        ...form,
      });

      await api.post("/send-confirmation-email", {
        uniqueId,
        ...petInfo,
        ...selectedPlan,
        ...form,
        email: petInfo.email,
        phone: petInfo.phone,
      });

      navigate("/success");
    } catch (error) {
      console.log(
        "Submit failed:",
        error.response?.data?.message || error.message || error
      );

      setErrors({
        submit:
          error.response?.data?.message ||
          error.message ||
          "Something went wrong. Please try again.",
      });

      setLoading(false);
    }
  };

  return (
    <QuoteLayout activeStep={3}>
      {loading && (
        <div className="page-loader">
          <div className="loader-box">
            <div className="loader-spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      )}

      <main className="personal-wrap">
        <form className="personal-card" onSubmit={handleNext}>
          <h1>Your Information</h1>
          <p>Your quote details are saved. Please complete your information.</p>

          <div className="personal-grid">
            <div>
              <label>First Name*</label>
              <input
                className={errors.firstName ? "input-error" : ""}
                value={form.firstName}
                onChange={(e) =>
                  updateField("firstName", onlyText(e.target.value))
                }
                placeholder="First name"
              />
            </div>

            <div>
              <label>Last Name*</label>
              <input
                className={errors.lastName ? "input-error" : ""}
                value={form.lastName}
                onChange={(e) =>
                  updateField("lastName", onlyText(e.target.value))
                }
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="personal-grid">
            <div>
              <label>DOB*</label>
              <input
                className={errors.dob ? "input-error" : ""}
                type="date"
                value={form.dob}
                min="1900-01-01"
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => updateField("dob", e.target.value)}
              />
            </div>

            <div>
              <label>SSN Number*</label>
              <input
                className={errors.ssn ? "input-error" : ""}
                value={form.ssn}
                onChange={(e) => updateField("ssn", formatSSN(e.target.value))}
                placeholder="XXX-XX-XXXX"
              />
            </div>
          </div>

          <label>Physical Address*</label>
          <input
            className={errors.address ? "input-error" : ""}
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            placeholder="Street address"
          />

          <div className="personal-grid">
            <div>
              <label>Apt / Unit</label>
              <input
                value={form.apartment}
                onChange={(e) => updateField("apartment", e.target.value)}
                placeholder="Apartment number"
              />
            </div>

            <div>
              <label>Zip Code*</label>
              <input
                className={errors.zipCode ? "input-error" : ""}
                value={form.zipCode}
                maxLength={5}
                onChange={(e) =>
                  updateField(
                    "zipCode",
                    e.target.value.replace(/\D/g, "").slice(0, 5)
                  )
                }
                placeholder="Zip code"
              />
            </div>
          </div>

          <div className="personal-grid">
            <div>
              <label>City*</label>
              <input
                className={errors.city ? "input-error" : ""}
                value={form.city}
                onChange={(e) => updateField("city", onlyText(e.target.value))}
                placeholder="City"
              />
            </div>

            <div>
              <label>State*</label>
              <select
                className={errors.state ? "input-error" : ""}
                value={form.state}
                onChange={(e) => updateField("state", e.target.value)}
              >
                <option value="">Select state</option>
                {states.map((stateName) => (
                  <option key={stateName} value={stateName}>
                    {stateName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errors.dob && <p className="field-error-text">{errors.dob}</p>}
          {errors.ssn && <p className="field-error-text">{errors.ssn}</p>}
          {errors.zipCode && (
            <p className="field-error-text">{errors.zipCode}</p>
          )}
          {errors.submit && (
            <p className="field-error-text">{errors.submit}</p>
          )}

          <button className="primary-quote-btn" type="submit" disabled={loading}>
            Submit
          </button>
        </form>
      </main>
    </QuoteLayout>
  );
}

export default PersonalInfo;