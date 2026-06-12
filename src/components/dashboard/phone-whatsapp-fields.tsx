"use client";

import { useState } from "react";

function formatPhoneNumber(value: string) {
  // Keep only digits
  let phone = value.replace(/\D/g, '');
  // Restrict to 10 digits
  return phone.slice(0, 10);
}

export function PhoneWhatsappFields({
  phone,
  whatsappNumber
}: {
  phone: string;
  whatsappNumber: string;
}) {
  const [phoneValue, setPhoneValue] = useState(formatPhoneNumber(phone));
  const [whatsappValue, setWhatsappValue] = useState(formatPhoneNumber(whatsappNumber));
  const [sameAsPhone, setSameAsPhone] = useState(phone === whatsappNumber);

  const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhone = formatPhoneNumber(event.target.value);
    setPhoneValue(formattedPhone);
    if (sameAsPhone) setWhatsappValue(formattedPhone);
  };

  const handleWhatsappChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setWhatsappValue(formatPhoneNumber(event.target.value));
  };

  return (
    <>
      <label>
        <span className="label">Phone</span>
        <input
          name="phone"
          className="field"
          type="tel"
          maxLength={10}
          inputMode="numeric"
          value={phoneValue}
          onChange={handlePhoneChange}
        />
      </label>
      <label>
        <span className="label">WhatsApp number</span>
        <input
          name="whatsapp_number"
          className="field"
          type="tel"
          maxLength={10}
          inputMode="numeric"
          value={whatsappValue}
          disabled={sameAsPhone}
          onChange={handleWhatsappChange}
        />
        {sameAsPhone ? <input type="hidden" name="whatsapp_number" value={whatsappValue} /> : null}
        <span className="mt-2 flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={sameAsPhone}
            onChange={(event) => {
              setSameAsPhone(event.target.checked);
              if (event.target.checked) setWhatsappValue(phoneValue);
            }}
          />
          Same as phone number
        </span>
      </label>
    </>
  );
}
