"use client";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function Dashboard() {
  const ebayOAuthUrl =
    'https://auth.ebay.com/oauth2/authorize?client_id=AndrewSa-Inventor-PRD-774c9724e-68eed72e&response_type=code&redirect_uri=Andrew_Sassine-AndrewSa-Invent-chvtg&scope=https://api.ebay.com/oauth/api_scope%20https://api.ebay.com/oauth/api_scope/sell.marketing.readonly%20https://api.ebay.com/oauth/api_scope/sell.marketing%20https://api.ebay.com/oauth/api_scope/sell.inventory.readonly%20https://api.ebay.com/oauth/api_scope/sell.inventory%20https://api.ebay.com/oauth/api_scope/sell.account.readonly%20https://api.ebay.com/oauth/api_scope/sell.account%20https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly%20https://api.ebay.com/oauth/api_scope/sell.fulfillment%20https://api.ebay.com/oauth/api_scope/sell.analytics.readonly%20https://api.ebay.com/oauth/api_scope/sell.finances%20https://api.ebay.com/oauth/api_scope/sell.payment.dispute%20https://api.ebay.com/oauth/api_scope/commerce.identity.readonly%20https://api.ebay.com/oauth/api_scope/sell.reputation%20https://api.ebay.com/oauth/api_scope/sell.reputation.readonly%20https://api.ebay.com/oauth/api_scope/commerce.notification.subscription%20https://api.ebay.com/oauth/api_scope/commerce.notification.subscription.readonly%20https://api.ebay.com/oauth/api_scope/sell.stores%20https://api.ebay.com/oauth/api_scope/sell.stores.readonly';

  return (
    <div
      className="grid gap-6 px-4 pt-4"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
    >
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Recent Out of Stock Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">28</div>
          <p className="text-xs text-muted-foreground">
            These items went out of stock within the last 30 days.<br /> Restock soon.
          </p>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Potential Sales Increase</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">$1645/month</div>
          <p className="text-xs text-muted-foreground">
            Restocking out-of-stock items could boost sales by this amount.
          </p>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lost Sales This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">$963</div>
          <p className="text-xs text-muted-foreground">
            Estimated revenue lost due to out-of-stock items.
          </p>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Restock Soon - Hot Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">7</div>
          <p className="text-xs text-muted-foreground">
            These items have been selling rapidly and are soon to go out-of-stock.
          </p>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Connect to eBay</CardTitle>
        </CardHeader>
        <CardContent>
          <button
            onClick={() => window.location.href = ebayOAuthUrl}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Sign in with eBay
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            Click the button above to connect your account to eBay.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
