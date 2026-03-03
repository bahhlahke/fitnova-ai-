"use client";

import { PageLayout, Card, CardHeader } from "@/components/ui";
import { FriendsList } from "@/components/social/FriendsList";
import { UserSearch } from "@/components/social/UserSearch";
import { AccountabilityPartner } from "@/components/social/AccountabilityPartner";

export default function FriendsPage() {
    return (
        <PageLayout title="Network & Accountability" subtitle="Connect with athletes and stay on track with a partner">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.6fr]">
                <div className="space-y-6">
                    <Card padding="lg">
                        <CardHeader title="Your Network" subtitle="Manage your connections and requests" />
                        <div className="mt-6">
                            <FriendsList />
                        </div>
                    </Card>

                    <Card padding="lg">
                        <CardHeader title="Accountability Partner" subtitle="Designate a partner to receive alerts if you miss your goals" />
                        <div className="mt-6">
                            <AccountabilityPartner />
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card padding="lg">
                        <CardHeader title="Find People" subtitle="Search for athletes by name" />
                        <div className="mt-6">
                            <UserSearch onAdd={() => { }} />
                        </div>
                    </Card>
                </div>
            </div>
        </PageLayout>
    );
}
