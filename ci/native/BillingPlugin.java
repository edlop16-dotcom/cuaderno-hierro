package pe.edgwr.cuadernohierro;

import android.content.Intent;
import android.net.Uri;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Suscripciones de Google Play (Billing Library 8) para Forja Pro.
 * getProducts({ids}) → planes con precio; purchase({productId, offerToken}); getActive(); manage({productId}).
 * Las compras se reconocen (acknowledge) automáticamente.
 */
@CapacitorPlugin(name = "Billing")
public class BillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient client;
    private PluginCall buyCall;
    private final Map<String, ProductDetails> details = new HashMap<>();

    private interface Ready { void run(); }

    private void ready(PluginCall call, Ready then) {
        if (client == null) {
            client = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .enableAutoServiceReconnection()
                .build();
        }
        if (client.isReady()) { then.run(); return; }
        client.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult r) {
                if (r.getResponseCode() == BillingClient.BillingResponseCode.OK) then.run();
                else call.reject("Google Play no está disponible (" + r.getResponseCode() + ")", String.valueOf(r.getResponseCode()));
            }
            @Override public void onBillingServiceDisconnected() { }
        });
    }

    @PluginMethod
    public void getProducts(PluginCall call) {
        JSArray ids = call.getArray("ids");
        ready(call, () -> {
            List<QueryProductDetailsParams.Product> list = new ArrayList<>();
            try {
                for (int i = 0; i < ids.length(); i++) list.add(QueryProductDetailsParams.Product.newBuilder().setProductId(ids.getString(i)).setProductType(BillingClient.ProductType.SUBS).build());
            } catch (Exception e) { call.reject("ids inválidos"); return; }
            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder().setProductList(list).build();
            client.queryProductDetailsAsync(params, (r, result) -> {
                if (r.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject("No se pudieron leer los planes (" + r.getResponseCode() + ")"); return; }
                JSArray out = new JSArray();
                for (ProductDetails pd : result.getProductDetailsList()) {
                    details.put(pd.getProductId(), pd);
                    List<ProductDetails.SubscriptionOfferDetails> offers = pd.getSubscriptionOfferDetails();
                    if (offers == null) continue;
                    for (ProductDetails.SubscriptionOfferDetails o : offers) {
                        JSObject x = new JSObject();
                        x.put("productId", pd.getProductId());
                        x.put("title", pd.getName());
                        x.put("basePlanId", o.getBasePlanId());
                        x.put("offerId", o.getOfferId());
                        x.put("offerToken", o.getOfferToken());
                        JSArray phases = new JSArray();
                        for (ProductDetails.PricingPhase ph : o.getPricingPhases().getPricingPhaseList()) {
                            JSObject p = new JSObject();
                            p.put("price", ph.getFormattedPrice());
                            p.put("micros", ph.getPriceAmountMicros());
                            p.put("currency", ph.getPriceCurrencyCode());
                            p.put("period", ph.getBillingPeriod());
                            p.put("cycles", ph.getBillingCycleCount());
                            phases.put(p);
                        }
                        x.put("phases", phases);
                        out.put(x);
                    }
                }
                JSObject res = new JSObject(); res.put("offers", out); call.resolve(res);
            });
        });
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String id = call.getString("productId"), token = call.getString("offerToken");
        ProductDetails pd = id == null ? null : details.get(id);
        if (pd == null || token == null) { call.reject("Primero carga los planes"); return; }
        ready(call, () -> {
            List<BillingFlowParams.ProductDetailsParams> list = new ArrayList<>();
            list.add(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(pd).setOfferToken(token).build());
            BillingFlowParams params = BillingFlowParams.newBuilder().setProductDetailsParamsList(list).build();
            buyCall = call;
            BillingResult r = client.launchBillingFlow(getActivity(), params);
            if (r.getResponseCode() != BillingClient.BillingResponseCode.OK) { buyCall = null; call.reject("No se pudo abrir el pago (" + r.getResponseCode() + ")"); }
        });
    }

    @Override
    public void onPurchasesUpdated(BillingResult r, List<Purchase> purchases) {
        PluginCall call = buyCall; buyCall = null;
        if (call == null) return;
        int code = r.getResponseCode();
        if (code == BillingClient.BillingResponseCode.USER_CANCELED) { call.reject("cancelado", "CANCEL"); return; }
        if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) { activeTo(call); return; }
        if (code != BillingClient.BillingResponseCode.OK || purchases == null) { call.reject("La compra no se completó (" + code + ")"); return; }
        JSArray out = new JSArray();
        for (Purchase p : purchases) out.put(handle(p));
        JSObject res = new JSObject(); res.put("purchases", out); call.resolve(res);
    }

    private JSObject handle(Purchase p) {
        JSObject x = new JSObject();
        x.put("products", new JSArray(p.getProducts()));
        x.put("token", p.getPurchaseToken());
        x.put("orderId", p.getOrderId());
        x.put("time", p.getPurchaseTime());
        x.put("autoRenew", p.isAutoRenewing());
        boolean ok = p.getPurchaseState() == Purchase.PurchaseState.PURCHASED;
        x.put("active", ok);
        x.put("pending", p.getPurchaseState() == Purchase.PurchaseState.PENDING);
        if (ok && !p.isAcknowledged()) {
            client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.getPurchaseToken()).build(), ar -> { });
        }
        return x;
    }

    private void activeTo(PluginCall call) {
        client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(), (r, list) -> {
            if (r.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject("No se pudo consultar (" + r.getResponseCode() + ")"); return; }
            JSArray out = new JSArray();
            for (Purchase p : list) out.put(handle(p));
            JSObject res = new JSObject(); res.put("purchases", out); call.resolve(res);
        });
    }

    @PluginMethod
    public void getActive(PluginCall call) { ready(call, () -> activeTo(call)); }

    @PluginMethod
    public void manage(PluginCall call) {
        String id = call.getString("productId", "");
        String url = "https://play.google.com/store/account/subscriptions" + (id.isEmpty() ? "" : "?sku=" + Uri.encode(id) + "&package=" + getContext().getPackageName());
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }
}
