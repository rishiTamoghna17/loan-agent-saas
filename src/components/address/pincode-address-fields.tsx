"use client";

import { useEffect, useMemo, useState } from "react";

type AddressOption = {
  name: string;
  district: string;
  state: string;
  pincode: string;
};

type PincodeAddressFieldsProps = {
  initialCity?: string;
  initialDistrict?: string;
  initialState?: string;
  initialPincode?: string;
  required?: boolean;
  disabled?: boolean;
  onAddressChange?: (address: { city: string; district: string; state: string; pincode: string }) => void;
  errors?: {
    city?: string;
    district?: string;
    state?: string;
    pincode?: string;
  };
};

export function PincodeAddressFields({
  initialCity = "",
  initialDistrict = "",
  initialState = "",
  initialPincode = "",
  required = false,
  disabled = false,
  onAddressChange,
  errors
}: PincodeAddressFieldsProps) {
  const [pincode, setPincode] = useState(initialPincode);
  const [city, setCity] = useState(initialCity);
  const [district, setDistrict] = useState(initialDistrict);
  const [state, setState] = useState(initialState);
  const [options, setOptions] = useState<AddressOption[]>([]);
  const [selectedOption, setSelectedOption] = useState(initialCity);
  const [lookupMessage, setLookupMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const requiredMark = required ? <span className="text-red-600">*</span> : null;
  const uniqueOptions = useMemo(
    () => options.filter((option, index, list) => list.findIndex((item) => item.name === option.name) === index),
    [options]
  );

  useEffect(() => {
    onAddressChange?.({ city, district, state, pincode });
  }, [city, district, onAddressChange, pincode, state]);

  useEffect(() => {
    if (!/^[0-9]{6}$/.test(pincode)) {
      setOptions([]);
      setLookupMessage("");
      return;
    }

    let ignore = false;
    setIsLoading(true);
    setLookupMessage("");

    fetch(`/api/address?pincode=${pincode}`)
      .then(async (response) => {
        const body = (await response.json()) as { addresses?: AddressOption[]; error?: string };
        if (ignore) return;

        if (!response.ok || !body.addresses?.length) {
          setOptions([]);
          setLookupMessage(body.error || "No address found for this pincode.");
          return;
        }

        setOptions(body.addresses);
        setLookupMessage("");

        const first = body.addresses[0];
        if (first) {
          setCity(first.name);
          setDistrict(first.district);
          setState(first.state);
          setSelectedOption(first.name);
        }
      })
      .catch(() => {
        if (!ignore) {
          setOptions([]);
          setLookupMessage("Address lookup failed. Please enter address manually.");
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [pincode]);

  function selectAddress(name: string) {
    setSelectedOption(name);
    const option = options.find((item) => item.name === name);
    if (!option) return;

    setCity(option.name);
    setDistrict(option.district);
    setState(option.state);
  }

  return (
    <>
      <label>
        <span className="label">Pincode {requiredMark}</span>
        <input
          name="pincode"
          className="field"
          inputMode="numeric"
          maxLength={6}
          value={pincode}
          onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="700001"
          disabled={disabled}
        />
        <span className="mt-1 block text-sm text-red-600">{errors?.pincode}</span>
      </label>

      <label>
        <span className="label">Area / city {requiredMark}</span>
        {uniqueOptions.length ? (
          <select name="city" className="field" value={selectedOption} onChange={(event) => selectAddress(event.target.value)} disabled={disabled}>
            {uniqueOptions.map((option) => (
              <option key={option.name} value={option.name}>{option.name}</option>
            ))}
          </select>
        ) : (
          <input name="city" className="field" value={city} onChange={(event) => setCity(event.target.value)} disabled={disabled} />
        )}
        <span className="mt-1 block text-xs text-slate-500">{isLoading ? "Looking up address..." : lookupMessage}</span>
        <span className="mt-1 block text-sm text-red-600">{errors?.city}</span>
      </label>

      <label>
        <span className="label">District {requiredMark}</span>
        <input name="district" className="field" value={district} onChange={(event) => setDistrict(event.target.value)} disabled={disabled} />
        <span className="mt-1 block text-sm text-red-600">{errors?.district}</span>
      </label>

      <label>
        <span className="label">State {requiredMark}</span>
        <input name="state" className="field" value={state} onChange={(event) => setState(event.target.value)} disabled={disabled} />
        <span className="mt-1 block text-sm text-red-600">{errors?.state}</span>
      </label>
    </>
  );
}
