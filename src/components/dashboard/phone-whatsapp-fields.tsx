"use client";

import { useState } from "react";

export function PhoneWhatsappFields({
  phone,
  whatsappNumber
}: {
  phone: string;
  whatsappNumber: string;
}) {
  const [phoneValue, setPhoneValue] = useState(phone);
  const [whatsappValue, setWhatsappValue] = useState(whatsappNumber);
  const [sameAsPhone, setSameAsPhone] = useState(phone === whatsappNumber);

  return (
    <>
      <label>
        <span className="label">Phone</span>
        <input
          name="phone"
          className="field"
          value={phoneValue}
          onChange={(event) => {
            setPhoneValue(event.target.value);
            if (sameAsPhone) setWhatsappValue(event.target.value);
          }}
        />
      </label>
      <label>
        <span className="label">WhatsApp number</span>
        <input
          name="whatsapp_number"
          className="field"
          value={whatsappValue}
          disabled={sameAsPhone}
          onChange={(event) => setWhatsappValue(event.target.value)}
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
