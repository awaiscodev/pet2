import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Cat, Dog, Mars, Venus, Search, ChevronDown } from "lucide-react";
import QuoteLayout from "../components/QuoteLayout";
import "../styles/PetInfo.css";
import api from "../api";
import { getVisitorDataForLead } from "../utils/visitorTracker";

const petAges = [
  "Less than 2 months",
  "2 to 11 months",
  "1 year",
  "2 years",
  "3 years",
  "4 years",
  "5 years",
  "6 years",
  "7 years",
  "8 years",
  "9 years",
  "10 years",
  "11 years",
  "12 years",
  "13+ years",
];

const dogBreeds = [
  "Mixed Breed - Toy (< 10 lbs)",
  "Mixed Breed - Small (11-30 lbs)",
  "Mixed Breed - Medium (31-50 lbs)",
  "Mixed Breed - Large (51-90 lbs)",
  "Mixed Breed - Giant (> 90 lbs)",
  "Beagle",
  "Boxer",
  "Bulldog",
  "Chihuahua",
  "Dachshund",
  "French Bulldog",
  "German Shepherd Dog",
  "Golden Retriever",
  "Labrador Retriever",
  "Pomeranian",
  "Poodle - Standard",
  "Pug",
  "Rottweiler",
  "Shih Tzu",
  "Yorkshire Terrier",
  "Other Dog",
];

const catBreeds = [
  "Domestic Shorthair",
  "Domestic Longhair",
  "American Shorthair",
  "British Shorthair",
  "Maine Coon",
  "Persian",
  "Ragdoll",
  "Russian Blue",
  "Siamese",
  "Sphynx",
  "Bengal",
  "Other Cat",
];

function PetInfo() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    petName: "",
    petSpecies: "",
    petSex: "",
    breed: "",
    age: "",
    zipCode: "",
    email: "",
    phone: "",
  });

  const [breedSearch, setBreedSearch] = useState("");
  const [showBreeds, setShowBreeds] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });

    const params = new URLSearchParams(location.search);
    const pet = params.get("pet");

    if (pet === "Dog" || pet === "Cat") {
      setForm((prev) => ({
        ...prev,
        petSpecies: pet,
        breed: "",
      }));
      setBreedSearch("");
    }
  }, [location.search]);

  const onlyText = (value) => value.replace(/[^a-zA-Z\s]/g, "");

  const breeds = form.petSpecies === "Cat" ? catBreeds : dogBreeds;

  const filteredBreeds = useMemo(() => {
    return breeds.filter((breed) =>
      breed.toLowerCase().includes(breedSearch.toLowerCase())
    );
  }, [breedSearch, breeds]);

  const updateField = (name, value) => {
    setForm({ ...form, [name]: value });
    setErrors((old) => ({ ...old, [name]: "" }));
  };

  const updateSpecies = (species) => {
    setForm({
      ...form,
      petSpecies: species,
      breed: "",
    });
    setErrors((old) => ({ ...old, petSpecies: "", breed: "" }));
    setBreedSearch("");
  };

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);

    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;

    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const selectBreed = (breed) => {
    updateField("breed", breed);
    setBreedSearch(breed);
    setShowBreeds(false);
  };

  const getDigits = (value) => value.replace(/\D/g, "");

  const handleNext = (e) => {
    e.preventDefault();

    const newErrors = {};
    const required = [
      "petName",
      "petSpecies",
      "petSex",
      "breed",
      "age",
      "zipCode",
      "email",
      "phone",
    ];

    required.forEach((item) => {
      if (!form[item]) newErrors[item] = "Required";
    });

    if (form.zipCode && getDigits(form.zipCode).length < 5) {
      newErrors.zipCode = "Zip code must be 5 digits";
    }

    if (form.phone && getDigits(form.phone).length < 10) {
      newErrors.phone = "Phone number must be 10 digits";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    localStorage.removeItem("uniqueId");
    localStorage.setItem("petInfo", JSON.stringify(form));

    setTimeout(() => {
      navigate("/select-plan");
    }, 1000);

    getVisitorDataForLead()
      .then((visitorData) => {
        return api.post("/create-lead", {
          ...form,
          visitorData,
        });
      })
      .then((response) => {
        const uniqueId = response.data.uniqueId;
        localStorage.setItem("uniqueId", uniqueId);
      })
      .catch((error) => {
        console.log("Pet info save failed:", error);
      });
  };

  return (
    <QuoteLayout activeStep={1}>
      {loading && (
        <div className="page-loader">
          <div className="loader-box">
            <div className="loader-spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      )}

      <main className="pet-info-wrap">
        <form className="pet-card" onSubmit={handleNext}>
          <h1>Your Customized Quote in Seconds</h1>
          <p>Tell us about your pet to prepare a personalized insurance quote.</p>

          <label>Pet’s Name*</label>
          <input
            className={errors.petName ? "input-error" : ""}
            value={form.petName}
            onChange={(e) => updateField("petName", onlyText(e.target.value))}
            placeholder="Enter your pet’s name"
          />

          <div className="form-grid">
            <div>
              <label>Your pet’s species*</label>
              <div className={errors.petSpecies ? "option-row option-error" : "option-row"}>
                <button
                  type="button"
                  className={form.petSpecies === "Dog" ? "option active" : "option"}
                  onClick={() => updateSpecies("Dog")}
                >
                  <Dog size={22} /> Dog
                </button>

                <button
                  type="button"
                  className={form.petSpecies === "Cat" ? "option active" : "option"}
                  onClick={() => updateSpecies("Cat")}
                >
                  <Cat size={22} /> Cat
                </button>
              </div>
            </div>

            <div>
              <label>Your pet’s gender*</label>
              <div className={errors.petSex ? "option-row option-error" : "option-row"}>
                <button
                  type="button"
                  className={form.petSex === "Male" ? "option active" : "option"}
                  onClick={() => updateField("petSex", "Male")}
                >
                  <Mars size={22} /> Male
                </button>

                <button
                  type="button"
                  className={form.petSex === "Female" ? "option active" : "option"}
                  onClick={() => updateField("petSex", "Female")}
                >
                  <Venus size={22} /> Female
                </button>
              </div>
            </div>
          </div>

          <label>Your Pet’s Breed*</label>
          <div className={errors.breed ? "custom-breed input-error" : "custom-breed"}>
            <div className="breed-input-row">
              <Search size={18} />

              <input
                value={breedSearch}
                onFocus={() => setShowBreeds(true)}
                onChange={(e) => {
                  setBreedSearch(e.target.value);
                  updateField("breed", "");
                  setShowBreeds(true);
                }}
                placeholder="Search or select breed"
              />

              <button
                type="button"
                onClick={() => setShowBreeds(!showBreeds)}
                className="breed-arrow"
              >
                <ChevronDown size={20} />
              </button>
            </div>

            {showBreeds && (
              <div className="breed-dropdown">
                {filteredBreeds.length > 0 ? (
                  filteredBreeds.map((breed) => (
                    <button type="button" key={breed} onClick={() => selectBreed(breed)}>
                      {breed}
                    </button>
                  ))
                ) : (
                  <p>No breed found</p>
                )}
              </div>
            )}
          </div>

          <div className="form-grid">
            <div>
              <label>Your Pet’s Age*</label>
              <select
                className={errors.age ? "input-error" : ""}
                value={form.age}
                onChange={(e) => updateField("age", e.target.value)}
              >
                <option value="">Select age</option>
                {petAges.map((age) => (
                  <option key={age}>{age}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Zip Code*</label>
              <input
                className={errors.zipCode ? "input-error" : ""}
                value={form.zipCode}
                maxLength={5}
                onChange={(e) =>
                  updateField("zipCode", e.target.value.replace(/\D/g, "").slice(0, 5))
                }
                placeholder="Enter zip code"
              />
            </div>
          </div>

          <label>Email Address*</label>
          <input
            className={errors.email ? "input-error" : ""}
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="Enter email"
          />

          <label>Phone Number*</label>
          <input
            className={errors.phone ? "input-error" : ""}
            value={form.phone}
            onChange={(e) => updateField("phone", formatPhone(e.target.value))}
            placeholder="(123) 456-7890"
          />

          {errors.phone && <p className="field-error-text">{errors.phone}</p>}
          {errors.submit && <p className="field-error-text">{errors.submit}</p>}

          <button className="primary-quote-btn" type="submit" disabled={loading}>
            Continue
          </button>
        </form>
      </main>
    </QuoteLayout>
  );
}

export default PetInfo;