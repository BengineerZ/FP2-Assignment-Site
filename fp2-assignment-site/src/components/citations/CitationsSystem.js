import React, { createContext, useContext, useRef, useState } from "react";

/**
 * 𝗖𝗶𝘁𝗮𝘁𝗶𝗼𝗻 𝗦𝘆𝘀𝘁𝗲𝗺 (dedup fix)
 *
 * <CitationProvider>
 *   …content with <Citation>nodes</Citation>…
 *   <CitationsList />
 * </CitationProvider>
 */

// ──────────────────────────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────────────────────────
const CitationContext = createContext();

// ──────────────────────────────────────────────────────────────────────────────
// Provider (dedupe handled via useRef for sync writes)
// ──────────────────────────────────────────────────────────────────────────────
export const CitationProvider = ({ children }) => {
  const [citations, setCitations] = useState([]);
  const citationsRef = useRef([]); // authoritative list, always in‑sync
  const sectionRef = useRef(null);

  const registerCitation = (raw) => {
    // Normalize (collapse whitespace + trim) so trivial differences don't duplicate
    const content =
      typeof raw === "string"
        ? raw.replace(/\s+/g, " ").trim()
        : raw;

    // Look in the ref first (includes citations added earlier in *this* render)
    const existingIndex = citationsRef.current.findIndex(
      (c) => c.content === content
    );
    if (existingIndex !== -1) return existingIndex + 1;

    // Add to ref & state *once*
    const newIndex = citationsRef.current.length + 1;
    citationsRef.current.push({ content });
    setCitations([...citationsRef.current]); // trigger re‑render with fresh array
    return newIndex;
  };

  const scrollToCitations = () => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <CitationContext.Provider
      value={{ registerCitation, scrollToCitations, citations, sectionRef }}
    >
      {children}
    </CitationContext.Provider>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Inline Citation Superscript
// ──────────────────────────────────────────────────────────────────────────────
export const Citation = ({ children }) => {
  const { registerCitation, scrollToCitations } = useContext(CitationContext);
  const index = registerCitation(children);

  return (
    <sup
      className="cursor-pointer text-blue-600 hover:underline"
      onClick={scrollToCitations}
    >
      [{index}]
    </sup>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Citations List (styling props supported)
// ──────────────────────────────────────────────────────────────────────────────
export const CitationsList = ({
  className = "mt-10 border-t border-gray-200 pt-6",
  headingClassName = "text-xl font-semibold mb-4",
  listClassName = "list-decimal ml-6 space-y-1",
  itemClassName = "leading-relaxed",
}) => {
  const { citations, sectionRef } = useContext(CitationContext);
  if (!citations.length) return null;

  return (
    <section id="citations-section" ref={sectionRef} className={className}>
      <h2 className={headingClassName}>Acknowledgement of Data Sources</h2>
      <ol className={listClassName}>
        {citations.map((c, i) => (
          <li key={i} className={itemClassName}>
            {c.content}
          </li>
        ))}
        <li className={itemClassName}>
          This project was developed with guidance and feedback from the <a href="https://www.mapc.org/">Metropolitan Area Planning Commission (MAPC)</a>.
        </li>
      </ol>
    </section>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Convenience wrapper
// ──────────────────────────────────────────────────────────────────────────────
const CitationSystem = ({ children }) => <CitationProvider>{children}</CitationProvider>;
export default CitationSystem;
