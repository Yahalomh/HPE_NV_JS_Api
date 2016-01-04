# HPE_NV_JS_Api

HPE NV allows a tester to simulate an IP network.
For example, if your application runs in a lab, but you still want to simulate a 3G cellular trafic between London to NY
you should use it.

NV gives you a web GUI, which doesn't fit to automatic test.

So, for automatic test, I create this lib. 
It implements rests calls to NV server:

1. Start recording.
2. Stop recording.
3. Add a transaction.
4. Get a report on the last run (after stop). It will suply a full report about the application network trafic, and a total mark
  about your application.

