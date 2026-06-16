"use client";

import { useEffect, useMemo, useState, useRef } from "react";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

function SearchableStateDropdown({
  value,
  onChange,
  disabled,
  inputClassName
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  inputClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearch(value);
    }
  }, [value, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredStates = useMemo(() => {
    if (!search) return INDIAN_STATES;
    return INDIAN_STATES.filter((s) =>
      s.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        className={inputClassName || "field"}
        value={search}
        placeholder="Search state..."
        disabled={disabled}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
          onChange(e.target.value);
        }}
      />
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none text-sm text-slate-800">
          {filteredStates.length > 0 ? (
            filteredStates.map((st) => (
              <button
                key={st}
                type="button"
                className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors focus:bg-slate-50 focus:outline-none text-slate-700"
                onClick={() => {
                  onChange(st);
                  setSearch(st);
                  setIsOpen(false);
                }}
              >
                {st}
              </button>
            ))
          ) : (
            <div className="px-4 py-2.5 text-slate-500">No matching states</div>
          )}
        </div>
      )}
    </div>
  );
}

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
  inputClassName?: string;
  useSearchableState?: boolean;
};

export function PincodeAddressFields({
  initialCity = "",
  initialDistrict = "",
  initialState = "",
  initialPincode = "",
  required = false,
  disabled = false,
  onAddressChange,
  errors,
  inputClassName,
  useSearchableState = false
}: PincodeAddressFieldsProps) {
  const [pincode, setPincode] = useState(initialPincode);
  const [city, setCity] = useState(initialCity);
  const [district, setDistrict] = useState(initialDistrict);
  const [state, setState] = useState(initialState);
  const [options, setOptions] = useState<AddressOption[]>([]);
  const [selectedOption, setSelectedOption] = useState(initialCity);
  const [lookupMessage, setLookupMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const lastReportedAddress = useRef({ city: initialCity, district: initialDistrict, state: initialState, pincode: initialPincode });
  const lastInitialProps = useRef({ initialCity, initialDistrict, initialState, initialPincode });

  // Sync local state when initial props change
  useEffect(() => {
    const last = lastInitialProps.current;
    if (
      last.initialCity !== initialCity ||
      last.initialDistrict !== initialDistrict ||
      last.initialState !== initialState ||
      last.initialPincode !== initialPincode
    ) {
      setPincode(initialPincode);
      setCity(initialCity);
      setDistrict(initialDistrict);
      setState(initialState);
      setSelectedOption(initialCity);
      lastInitialProps.current = { initialCity, initialDistrict, initialState, initialPincode };
      lastReportedAddress.current = { city: initialCity, district: initialDistrict, state: initialState, pincode: initialPincode };
    }
  }, [initialCity, initialDistrict, initialState, initialPincode]);

  const requiredMark = required ? <span className="text-red-600">*</span> : null;
  const uniqueOptions = useMemo(
    () => options.filter((option, index, list) => list.findIndex((item) => item.name === option.name) === index),
    [options]
  );

  useEffect(() => {
    const newAddress = { city, district, state, pincode };
    const last = lastReportedAddress.current;
    
    if (
      newAddress.city !== last.city ||
      newAddress.district !== last.district ||
      newAddress.state !== last.state ||
      newAddress.pincode !== last.pincode
    ) {
      onAddressChange?.(newAddress);
      lastReportedAddress.current = newAddress;
    }
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

  const defaultInputClass = "field";
  const inputClass = inputClassName || defaultInputClass;

  return (
    <>
      <label>
        <span className="label">Pincode {requiredMark}</span>
        <input
          name="pincode"
          className={inputClass}
          inputMode="numeric"
          maxLength={6}
          value={pincode}
          onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="700001"
          disabled={disabled}
        />
        <div className="min-h-[20px] mt-1">
          {errors?.pincode && <span className="block text-xs text-red-600">{errors.pincode}</span>}
        </div>
      </label>

      <label>
        <span className="label">Area / city {requiredMark}</span>
        {uniqueOptions.length ? (
          <select name="city" className={inputClass} value={selectedOption} onChange={(event) => selectAddress(event.target.value)} disabled={disabled}>
            {uniqueOptions.map((option) => (
              <option key={option.name} value={option.name}>{option.name}</option>
            ))}
          </select>
        ) : (
          <input name="city" className={inputClass} value={city} onChange={(event) => setCity(event.target.value)} disabled={disabled} />
        )}
        <span className="mt-1 block text-xs text-slate-500">{isLoading ? "Looking up address..." : lookupMessage}</span>
        <div className="min-h-[20px] mt-1">
          {errors?.city && <span className="block text-xs text-red-600">{errors.city}</span>}
        </div>
      </label>

      <label>
        <span className="label">District {requiredMark}</span>
        <input name="district" className={inputClass} value={district} onChange={(event) => setDistrict(event.target.value)} disabled={disabled} />
        <div className="min-h-[20px] mt-1">
          {errors?.district && <span className="block text-xs text-red-600">{errors.district}</span>}
        </div>
      </label>

      <label>
        <span className="label">State {requiredMark}</span>
        {useSearchableState ? (
          <SearchableStateDropdown
            value={state}
            onChange={(val) => setState(val)}
            disabled={disabled}
            inputClassName={inputClass}
          />
        ) : (
          <input name="state" className={inputClass} value={state} onChange={(event) => setState(event.target.value)} disabled={disabled} />
        )}
        <div className="min-h-[20px] mt-1">
          {errors?.state && <span className="block text-xs text-red-600">{errors.state}</span>}
        </div>
      </label>
    </>
  );
}
