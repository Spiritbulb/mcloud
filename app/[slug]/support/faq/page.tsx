import { PageHeader } from "@/components/admin/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

export default function FAQPage() {
    const faqs = [
        {
            question: "How do I deploy a new app?",
            answer: "Navigate to the Apps section and click 'Deploy New App'. Follow the wizard to configure your app settings and deploy.",
        },
        {
            question: "What payment methods do you accept?",
            answer: "We accept credit cards (Visa, Mastercard, Amex) and M-Pesa for local payments in Kenya.",
        },
        {
            question: "How do I upgrade my subscription?",
            answer: "Go to Billing > Subscription and select the plan you want to upgrade to. Changes take effect immediately.",
        },
        {
            question: "Can I add custom domains?",
            answer: "Yes! Custom domains are available on Professional and Enterprise plans. Go to Apps > Domains to add your domain.",
        },
        {
            question: "How do I contact support?",
            answer: "You can create a support ticket, email us at support@spiritbulb.com, or use the contact form in the Support section.",
        },
        {
            question: "Is there a free trial?",
            answer: "Yes, we offer a 14-day free trial with full access to Professional plan features. No credit card required.",
        },
    ]

    return (
        <div className="space-y-6">
            <PageHeader
                title="Frequently Asked Questions"
                description="Find answers to common questions"
            />

            <Card className="google-card border-outline bg-surface">
                <CardHeader>
                    <CardTitle className="text-headline-small text-on-surface">
                        Common Questions
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {faqs.map((faq, index) => (
                            <AccordionItem key={index} value={`item-${index}`}>
                                <AccordionTrigger className="text-on-surface hover:text-primary">
                                    {faq.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-on-surface-variant">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
        </div>
    )
}
