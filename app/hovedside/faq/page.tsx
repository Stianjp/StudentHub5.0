import type { Metadata } from "next";
import { HeroSection } from "@/components/hovedside/hero-section";
import { SectionWrapper } from "@/components/hovedside/section-wrapper";
import { FaqAccordion } from "@/components/hovedside/faq-accordion";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about Oslo Student Hub.",
};

const STUDENT_FAQ = [
  {
    question: "How do I register as a student?",
    answer:
      "You can register by clicking the Register button on our Students page. Fill in your details and you'll be part of our community.",
  },
  {
    question: "Is it free to attend events?",
    answer:
      "Yes, all our student events are free of charge. We believe in making career opportunities accessible to everyone.",
  },
  {
    question: "Which universities are included?",
    answer:
      "We work with students from all universities in Oslo, including OsloMet, UiO, Høyskolen Kristiania, NMBU, and more.",
  },
  {
    question: "Do I need to be a specific year or program?",
    answer:
      "No! We welcome students from all years and programs. Whether you're a first-year bachelor or finishing your master's thesis, there are opportunities for you.",
  },
];

const PARTNER_FAQ = [
  {
    question: "How can my company participate?",
    answer:
      "Visit our Partners page to learn about partnership options. You can register for events, host company presentations, or become a long-term partner.",
  },
  {
    question: "What packages are available?",
    answer:
      "We offer Standard, Silver, Gold, and Platinum packages with varying levels of visibility, stand sizes, and access to student data.",
  },
  {
    question: "How do I register for Student Connect 2026?",
    answer:
      "Go to the Student Connect 2026 page and click 'Company registration'. Fill in the registration form and our team will review your application.",
  },
];

const EVENT_FAQ = [
  {
    question: "When is Student Connect 2026?",
    answer:
      "Student Connect 2026 takes place on October 6th, 2026, at Radisson Blu Scandinavia in Oslo, from 11:00 to 15:00.",
  },
  {
    question: "Where are the events held?",
    answer:
      "Our events are held at various venues across Oslo. Student Connect 2026 will be at Radisson Blu Scandinavia.",
  },
  {
    question: "How many students usually attend?",
    answer:
      "Our events typically attract hundreds of students from multiple universities in Oslo. Student Connect is our largest event.",
  },
];

export default function FaqPage() {
  return (
    <>
      <HeroSection
        title="Frequently Asked Questions"
        subtitle="Find answers to common questions about Oslo Student Hub, our events, and how to get involved."
      />

      <div className="h-2 bg-gradient-to-r from-secondary via-pink to-purple" />

      <SectionWrapper>
        <div className="mx-auto max-w-3xl">
          <FaqAccordion title="For Students" items={STUDENT_FAQ} />
          <FaqAccordion title="For Partners" items={PARTNER_FAQ} />
          <FaqAccordion title="About Events" items={EVENT_FAQ} />
        </div>
      </SectionWrapper>
    </>
  );
}
