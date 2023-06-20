define(
    [
        'Magento_Checkout/js/view/payment/default',
        'Bold_Checkout/js/model/client',
        'Magento_Checkout/js/model/quote',
        'Magento_Checkout/js/model/full-screen-loader',
        'uiRegistry',
        'checkoutData',
        'underscore',
        'ko'
    ], function (
        Component,
        boldClient,
        quote,
        loader,
        registry,
        checkoutData,
        _,
        ko
    ) {
        'use strict';
        return Component.extend({
            defaults: {
                template: 'Bold_Checkout/payment/bold.html',
                paymentType: null,
                isVisible: ko.observable(false),
                iframeSrc: ko.observable(null),
            },

            /**
             * @inheritDoc
             */
            initialize: function () {
                if (window.checkoutConfig.bold === undefined) {
                    return;
                }
                this._super();
                this.customerIsGuest = !!Number(window.checkoutConfig.bold.customerIsGuest);
                if (checkoutData.getSelectedPaymentMethod() === 'bold') {
                    checkoutData.setSelectedPaymentMethod(null);
                    quote.paymentMethod(null);
                }
                this.syncBillingData();
                quote.billingAddress.subscribe(function () {
                    const sendBillingAddress = _.debounce(
                        function () {
                            this.syncBillingData();
                        }.bind(this),
                        1000
                    );
                    sendBillingAddress();
                }, this);
                const email = registry.get('index = customer-email');
                if (email) {
                    email.email.subscribe(function () {
                        if (email.validateEmail()) {
                            const sendGuestCustomerInfo = _.debounce(
                                function () {
                                    this.sendGuestCustomerInfo();
                                }.bind(this),
                                1000
                            );
                            sendGuestCustomerInfo();
                        }
                    }.bind(this));
                }
                if (!this.customerIsGuest) {
                    this.isVisible(true);
                    this.iframeSrc(window.checkoutConfig.bold.payment.iframeSrc);
                    this.subscribeToPIGI();
                }
            },

            /**
             * @inheritDoc
             */
            selectPaymentMethod: function () {
                const iframeElement = document.getElementById('PIGI');
                this.iframeWindow = iframeElement ? iframeElement.contentWindow : null;
                this._super();
                if (this.iframeWindow) {
                    this.iframeWindow.postMessage({actionType: 'PIGI_REFRESH_ORDER'}, '*');
                }
                return true;
            },

            /**
             * @inheritDoc
             */
            placeOrder: function (data, event) {
                if (!this.iframeWindow) {
                    return;
                }
                if (!this.paymentType) {
                    loader.startLoader();
                    const clearAction = {actionType: 'PIGI_CLEAR_ERROR_MESSAGES'};
                    const addPaymentAction = {actionType: 'PIGI_ADD_PAYMENT'};
                    this.iframeWindow.postMessage(clearAction, '*');
                    this.iframeWindow.postMessage(addPaymentAction, '*');
                    return;
                }
                this.paymentType = null;
                this._super(data, event);
            },

            /**
             * Send guest customer info to Bold.
             *
             * @private
             * @returns void
             */
            sendGuestCustomerInfo: function () {
                if (!this.customerIsGuest) {
                    return;
                }
                boldClient.post('customer/guest', 'customer').then(function () {
                        this.messageContainer.errorMessages([]);
                        if (this.iframeWindow) {
                            this.iframeWindow.postMessage({actionType: 'PIGI_REFRESH_ORDER'}, '*');
                        }
                    }.bind(this)
                ).then(
                    function () {
                        this.isVisible(true);
                        this.iframeSrc(window.checkoutConfig.bold.payment.iframeSrc);
                        this.subscribeToPIGI();
                    }.bind(this)
                ).catch(function () {
                        this.messageContainer.errorMessages(
                            [
                                'Please verify your email and try again.'
                            ]
                        );
                    }.bind(this)
                );
            },

            /**
             * Subscribe to PIGI events.
             *
             * @private
             * @returns {void}
             */
            subscribeToPIGI() {
                window.addEventListener('message', ({data}) => {
                    const responseType = data.responseType;
                    if (responseType) {
                        switch (responseType) {
                            case 'PIGI_UPDATE_HEIGHT':
                                const iframeElement = document.querySelector('iframe#PIGI');
                                if (iframeElement.style.height === Math.round(data.payload.height) + 'px') {
                                    return;
                                }
                                iframeElement.style.height = Math.round(data.payload.height) + 'px';
                                break;
                            case 'PIGI_INITIALIZED':
                                break;
                            case 'PIGI_REFRESH_ORDER':
                                break;
                            case 'PIGI_ADD_PAYMENT':
                                this.messageContainer.errorMessages([]);
                                if (!data.payload.success) {
                                    this.messageContainer.errorMessages(
                                        [
                                            'Please verify your payment information and try again.'
                                        ]
                                    );
                                    loader.stopLoader();
                                    this.paymentType = null;
                                    return;
                                }
                                this.paymentType = data.payload.paymentType;
                                if (this.paymentType !== 'paypal') {
                                    loader.startLoader();
                                    this.placeOrder({}, null);
                                    return;
                                }
                                this.messageContainer.successMessages(['Success']);
                        }
                    }
                });
            },

            /**
             * Send billing address to Bold.
             *
             * @private
             * @returns {void}
             */
            syncBillingData() {
                this.sendGuestCustomerInfo();
                boldClient.post('addresses/billing', 'address').then(function () {
                    this.messageContainer.errorMessages([]);
                    if (this.iframeWindow) {
                        this.iframeWindow.postMessage({actionType: 'PIGI_REFRESH_ORDER'}, '*');
                    }
                }.bind(this)).catch(function () {
                    this.messageContainer.errorMessages(
                        [
                            'Please verify your billing information and try again.'
                        ]
                    );
                }.bind(this));
            },
        });
    });
