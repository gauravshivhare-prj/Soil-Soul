"use client";

import { useState } from "react";
import Link from "next/link";
import { brandSerif } from "@/app/fonts";
import { PageContainer } from "@/components/ui/PageHeader";
import Icon from "@/components/ui/Icon";

const INQUIRY_TYPES = [
  "Plant Care / Health Consultation",
  "Order Status & Shipping Query",
  "Return or Exchange Assistance",
  "Bulk / Corporate Nursery Gifting",
  "General Inquiry / Feedback",
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    orderNumber: "",
    inquiryType: INQUIRY_TYPES[0],
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Client-side simulate submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <main className="bg-[#faf8f2] pb-16">
      <PageContainer className="pt-8 sm:pt-12">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-10">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.2em] text-[#71816a]">
            Connect With Our Nursery Team
          </p>
          <h1 className={`${brandSerif.className} m-0 mt-3 text-3xl sm:text-5xl font-bold text-[#1f3d24]`}>
            We&apos;re Here to Help You Grow
          </h1>
          <p className="m-0 mt-3 text-base sm:text-lg leading-relaxed text-[#4a5547]">
            Whether you need botanical advice for a yellowing leaf, have questions about your order, or want recommendations for living soil, our team is always ready.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] max-w-6xl mx-auto">
          {/* Contact Form */}
          <div className="rounded-3xl border border-line bg-white p-6 sm:p-10 shadow-xs">
            <h2 className={`${brandSerif.className} m-0 text-2xl font-bold text-[#1f3d24] mb-2`}>
              Send Us a Message
            </h2>
            <p className="m-0 text-sm text-muted mb-6">
              Fill out the form below and a botanical specialist will respond within 24 hours.
            </p>

            {submitted ? (
              <div className="rounded-2xl bg-sage-50 border border-sage-200 p-8 text-center space-y-3">
                <span className="text-4xl">🌱</span>
                <h3 className={`${brandSerif.className} text-xl font-bold text-[#1f3d24] m-0`}>
                  Thank you for reaching out!
                </h3>
                <p className="text-sm text-muted m-0">
                  We have received your message. Our nursery team will get back to your email ({formData.email}) shortly.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setFormData({
                      name: "",
                      email: "",
                      phone: "",
                      orderNumber: "",
                      inquiryType: INQUIRY_TYPES[0],
                      message: "",
                    });
                  }}
                  className="mt-4 px-5 py-2 rounded-lg bg-forest text-cream text-xs font-medium cursor-pointer border-0 hover:bg-forest-dark transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="block text-xs font-semibold text-ink mb-1">
                      Your Name *
                    </label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Gaurav Sharma"
                      className="w-full h-11 px-3.5 rounded-xl border border-line bg-sand/30 text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-ink mb-1">
                      Email Address *
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="gaurav@example.com"
                      className="w-full h-11 px-3.5 rounded-xl border border-line bg-sand/30 text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="phone" className="block text-xs font-semibold text-ink mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full h-11 px-3.5 rounded-xl border border-line bg-sand/30 text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                    />
                  </div>
                  <div>
                    <label htmlFor="order" className="block text-xs font-semibold text-ink mb-1">
                      Order Number (if applicable)
                    </label>
                    <input
                      id="order"
                      type="text"
                      value={formData.orderNumber}
                      onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                      placeholder="e.g. ORD-202611-ABCD"
                      className="w-full h-11 px-3.5 rounded-xl border border-line bg-sand/30 text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="type" className="block text-xs font-semibold text-ink mb-1">
                    What can we help you with? *
                  </label>
                  <select
                    id="type"
                    value={formData.inquiryType}
                    onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-line bg-sand/30 text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                  >
                    {INQUIRY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-xs font-semibold text-ink mb-1">
                    Your Message *
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Describe your plant question, space lighting, or order concern..."
                    className="w-full p-3.5 rounded-xl border border-line bg-sand/30 text-sm text-ink outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl bg-forest text-cream font-medium text-sm flex items-center justify-center gap-2 hover:bg-forest-dark transition-colors cursor-pointer border-0 shadow-sm"
                >
                  {isSubmitting ? "Sending your message…" : "Send Message to Botanical Team"}
                </button>
              </form>
            )}
          </div>

          {/* Contact Information & Channels */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-xs">
              <h3 className={`${brandSerif.className} m-0 text-xl font-bold text-[#1f3d24] mb-4`}>
                Botanical Studio &amp; Nursery
              </h3>

              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-sage-50 text-forest flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="pin" size={18} />
                  </div>
                  <div>
                    <strong className="text-ink block">Nursery &amp; Living Soil Studio</strong>
                    <span className="text-muted leading-relaxed">
                      Soil &amp; Soul Nursery,
                      <br />
                      Bhopal, Madhya Pradesh, India
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-sage-50 text-forest flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="mail" size={18} />
                  </div>
                  <div>
                    <strong className="text-ink block">Email Support</strong>
                    <a href="mailto:soil&soul@gmail.com" className="text-forest hover:underline">
                      soil&soul@gmail.com
                    </a>
                    <span className="block text-xs text-muted">Response within 24 hours</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-sage-50 text-forest flex items-center justify-center shrink-0 mt-0.5">
                    <Icon name="phone" size={18} />
                  </div>
                  <div>
                    <strong className="text-ink block">Botanical Helpline</strong>
                    <a href="tel:98741512xx" className="text-forest hover:underline font-medium">
                      +91 98741512xx
                    </a>
                    <span className="block text-xs text-muted">Mon–Sat: 9:00 AM – 7:00 PM IST</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Assistant Quick Pill */}
            <div className="rounded-3xl border border-forest/20 bg-forest text-cream p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-cream/15 text-cream flex items-center justify-center text-lg">
                  🌿
                </div>
                <div>
                  <h4 className="m-0 text-base font-bold text-cream">Need Instant Plant Care Advice?</h4>
                  <p className="m-0 text-xs text-sage-100/80">Sprout AI Concierge is available 24/7</p>
                </div>
              </div>
              <p className="m-0 text-xs leading-relaxed text-cream/90 mb-4">
                You can diagnose leaf discolouration, check pet safety for specific plants, and get watering recommendations instantly without waiting!
              </p>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cream text-forest text-xs font-semibold hover:bg-white transition-colors no-underline"
              >
                Chat with Sprout in bottom right →
              </Link>
            </div>
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
