import { PageLayout, Card } from "@/components/ui";

export default function TermsPage() {
    return (
        <PageLayout title="Terms of Service" subtitle="Rules of the arena">
            <Card padding="lg" className="prose prose-invert max-w-none">
                <div className="space-y-8 text-fn-muted leading-relaxed">
                    <section>
                        <h2 className="text-2xl font-display text-white mb-4 italic uppercase tracking-tight">1. Acceptance of Terms</h2>
                        <p>
                            By accessing or using Fitness Nova AI, you agree to be bound by these Terms of Service. If you do not agree, you may not use the platform.
                        </p>
                    </section>

                    <section className="bg-fn-accent/5 border border-fn-accent/20 rounded-2xl p-6">
                        <h2 className="text-2xl font-display text-fn-accent mb-4 italic uppercase tracking-tight">2. SMS Terms (Mobile Messaging)</h2>
                        <p className="text-white mb-4">
                            When you opt-in to our SMS services, you agree to the following:
                        </p>
                        <div className="space-y-4">
                            <p>
                                <strong>Program Description:</strong> Fitness Nova AI sends coaching alerts, daily briefings, and motivational messages to your mobile device.
                            </p>
                            <p>
                                <strong>Message Frequency:</strong> Message frequency varies. We prioritize high-signal communication to support your fitness goals.
                            </p>
                            <p>
                                <strong>Cost:</strong> Message and data rates may apply. Check with your mobile carrier for details.
                            </p>
                            <p>
                                <strong>Carriers:</strong> Carriers are not liable for delayed or undelivered messages.
                            </p>
                            <p>
                                <strong>Opt-out:</strong> You can cancel the SMS service at any time. Just text &quot;STOP&quot; to the short code/number. After you send the SMS message &quot;STOP&quot; to us, we will send you an SMS message to confirm that you have been unsubscribed.
                            </p>
                            <p>
                                <strong>Support:</strong> If you are experiencing issues with the messaging program you can reply with the keyword &quot;HELP&quot; for more assistance, or you can get help directly at support@askkodaai.com.
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-display text-white mb-4 italic uppercase tracking-tight">3. User Conduct</h2>
                        <p>
                            You agree to use Fitness Nova AI only for lawful purposes and in a way that does not infringe the rights of others.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-display text-white mb-4 italic uppercase tracking-tight">4. Disclaimer</h2>
                        <p>
                            Fitness Nova AI provides educational fitness coaching. It is not medical advice. Consult with a healthcare professional before starting any new exercise program.
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
