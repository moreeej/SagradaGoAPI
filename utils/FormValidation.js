/**
 * Validate wedding form
 * @param {object} weddingForm - The wedding form data
 * @returns {object} { valid: boolean, message: string }
 */
function validateWeddingForm(weddingForm) {
  if (!weddingForm.groom_fullname || weddingForm.groom_fullname.trim() === "") {
    return { valid: false, message: "Groom's full name is required." };
  }

  if (!weddingForm.bride_fullname || weddingForm.bride_fullname.trim() === "") {
    return { valid: false, message: "Bride's full name is required." };
  }

  if (!weddingForm.contact_no || weddingForm.contact_no.trim() === "") {
    return { valid: false, message: "Contact number is required." };
  }

  // Validate phone number format (11 digits for PH)
  const phoneRegex = /^[0-9]{11}$/;
  if (!phoneRegex.test(weddingForm.contact_no.replace(/\D/g, ""))) {
    return { valid: false, message: "Please enter a valid 11-digit phone number." };
  }

  return { valid: true, message: "" };
}

/**
 * Validate baptism form
 * @param {object} baptismForm - The baptism form data
 * @returns {object} { valid: boolean, message: string }
 */
function validateBaptismForm(baptismForm) {
  if (!baptismForm.main_godfather || Object.keys(baptismForm.main_godfather).length === 0) {
    return { valid: false, message: "Main godfather information is required." };
  }

  if (!baptismForm.main_godmother || Object.keys(baptismForm.main_godmother).length === 0) {
    return { valid: false, message: "Main godmother information is required." };
  }

  return { valid: true, message: "" };
}

/**
 * Validate burial form
 * @param {object} burialForm - The burial form data
 * @returns {object} { valid: boolean, message: string }
 */
function validateBurialForm(burialForm) {
  const hasSelection = burialForm.funeral_mass || 
                       burialForm.death_anniversary || 
                       burialForm.funeral_blessing || 
                       burialForm.tomb_blessing;

  if (!hasSelection) {
    return { valid: false, message: "Please select at least one burial service." };
  }

  return { valid: true, message: "" };
}

module.exports = {
  validateWeddingForm,
  validateBaptismForm,
  validateBurialForm,
};

