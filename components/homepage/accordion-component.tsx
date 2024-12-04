import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { TITLE_TAILWIND_CLASS } from "@/utils/constants"

export function AccordionComponent() {
    return (
        <div className="flex flex-col w-[70%] lg:w-[50%]">
            <h2 className={`${TITLE_TAILWIND_CLASS} mt-2 font-semibold text-center tracking-tight dark:text-white text-gray-900`}>
                Frequently Asked Questions (FAQs)
            </h2>
            <Accordion type="single" collapsible className="w-full mt-2">
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <span className="font-medium">How does this tool help me manage my eBay inventory?</span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Our tool provides real-time inventory analytics, 
                            helping you identify best-selling products, 
                            track stock levels, 
                            and avoid running out of high-demand items. 
                            With actionable insights, 
                            you can optimize restocking decisions and reduce overstocking, 
                            saving time and money.
                        </p>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <span className="font-medium">Can this tool integrate directly with my eBay store?</span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Yes, our platform seamlessly integrates with your eBay store.
                            Once connected, it automatically pulls data from your listings
                            and provides detailed insights on your inventory performance.
                        </p>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <span className="font-medium">Will this tool notify me if my inventory is running low?</span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Absolutely! Our tool includes customizable alerts for low stock levels,
                            ensuring you never miss an opportunity to restock your best-selling items.
                        </p>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <span className="font-medium">How does this tool improve my eBay sales?</span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            By analyzing your inventory and sales data, this tool highlights
                            trends such as your top-performing products and season demanded patterns.
                            This allow you to focus on items that drive revenue and capitalize on
                            growth opportunities.
                        </p>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <span className="font-medium">Is my eBay store data secure with this tool?</span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            Yes, your data is securely encrypted and protected using industry-leading standards.
                            We prioritize your privacy and promise to never share it with anyone else. We also make 
                            sure to comply with eBay&apos;s security guidelines.
                        </p>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <span className="font-medium">Can I use this tool for multiple eBay stores?</span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            We do not currently support multiple eBay stores under one account, but you can 
                            create multiple accounts for multiple stores. However, we do plan to allow multiple
                            eBay stores to be accessed under the same account in the future for enterprise users.
                        </p>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <span className="font-medium">Is there a free trial available for this tool?</span>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p>
                            While we do not offer a free trial for this tool, we do offer a 30-day money back guarantee. 
                            If you are not satisfied with our tool after 30 days, you are eligible for a full refund.
                            Try out our tool and see how it can transform the way you manage your eBay inventory.
                        </p>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    )
}
