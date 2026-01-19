import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function ContactPage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Contact Us"
                description="Get in touch with our support team"
            />

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="google-card border-outline bg-surface lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-headline-small text-on-surface">
                            Send us a message
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-on-surface">
                                    Name
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="Your name"
                                    className="bg-surface border-outline"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-on-surface">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    className="bg-surface border-outline"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="subject" className="text-on-surface">
                                Subject
                            </Label>
                            <Input
                                id="subject"
                                placeholder="How can we help?"
                                className="bg-surface border-outline"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="message" className="text-on-surface">
                                Message
                            </Label>
                            <Textarea
                                id="message"
                                placeholder="Describe your issue or question..."
                                rows={6}
                                className="bg-surface border-outline"
                            />
                        </div>

                        <button className="google-button-primary py-2 px-4 text-body-medium">
                            Send Message
                        </button>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="google-card border-outline bg-surface">
                        <CardHeader>
                            <CardTitle className="text-headline-small text-on-surface">
                                Other ways to reach us
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-on-surface mb-1">Email</p>
                                <p className="text-sm text-on-surface-variant">
                                    support@spiritbulb.com
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-on-surface mb-1">Phone</p>
                                <p className="text-sm text-on-surface-variant">
                                    +254 712 345 678
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-on-surface mb-1">
                                    Response Time
                                </p>
                                <p className="text-sm text-on-surface-variant">
                                    Usually within 24 hours
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
