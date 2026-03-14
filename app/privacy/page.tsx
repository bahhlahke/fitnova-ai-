import { PageLayout, Card } from "@/components/ui";

export default function PrivacyPage() {
    return (
        <PageLayout title="Privacy Policy" subtitle="How we handle your data">
            <Card padding="lg" className="prose prose-invert max-w-none">
                <div className="space-y-8 text-fn-muted leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-display text-white mb-4 italic uppercase tracking-tight">1. Overview</h2>
                        <p>
                            Fitness Nova AI (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our fitness coaching platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-display text-white mb-4 italic uppercase tracking-tight">2. Information Collection</h2>
                        <p>
                            We collect information you provide directly to us, including your name, email address, phone number, and physical metrics (age, height, weight) to personalize your coaching experience.
                        </p>
                    </section>

                    <section className="bg-fn-accent/5 border border-fn-accent/20 rounded-2xl p-6">
                        <h2 className="text-2xl font-display text-fn-accent mb-4 italic uppercase tracking-tight">3. SMS and Text Messaging</h2>
                        <p className="text-white mb-4">
                            By providing your mobile phone number and opting in to receive messages, you consent to receive SMS/text messages from Fitness Nova AI for coaching reminders, motivational nudges, and account updates.
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>SMS Consent:</strong> Your consent to receive SMS is obtained through a clear checkbox at registration or in your settings. Your phone number is not shared with third parties for marketing purposes.</li>
                            <li><strong>Frequency:</strong> Message frequency varies based on your coaching preferences and activity level.</li>
                            <li><strong>Opt-out:</strong> You can opt-out of SMS messages at any time by replying &quot;STOP&quot; to any message or updating your preferences in the Settings page.</li>
                            <li><strong>Assistance:</strong> Reply &quot;HELP&quot; for help, or contact support at support@askkodaai.com.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-display text-white mb-4 italic uppercase tracking-tight">4. Third-Party Sharing</h2>
                        <p>
                            We do not sell your personal data. We share information only with service providers (like Twilio for SMS or Stripe for payments) necessary to provide our services, and only as permitted by law.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-display text-white mb-4 italic uppercase tracking-tight">5. Security</h2>
                        <p>
                            We implement industry-standard security measures to protect your data, including encryption and secure database protocols provided by Supabase.
                        </p>
                    </section>

                    <p className="text-xs pt-8 border-t border-white/5 italic">
                        Last Updated: March 9, 2026
                    </p>
                </div>
            </Card>
        </PageLayout>
    );
}
