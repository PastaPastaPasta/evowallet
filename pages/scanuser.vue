<template>
  <div class="text-center">
    <QReader class="mt-10" />
    <!-- <v-btn class="mt-10" @click="sendPaymentIntent"
      ><v-icon>mdi-qrcode</v-icon> Dash Donuts</v-btn
    > -->
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import QReader from '../components/QReader'
const timestamp = () => Math.floor(Date.now() / 1000)

export default {
  components: { QReader },
  created() {
    if (this.$store.state.name.isRegistered === false)
      window.location.href = '/' // TODO use router
  },
  methods: {
    ...mapActions(['submitDocument', 'freshAddress']),
    async sendPaymentIntent() {
      const { submitDocument, freshAddress } = this

      const contract = 'PaymentRequest'
      const typeLocator = 'PaymentIntent'

      const requesteeUserId = this.$store.state.name.docId
      const requesteeUserName = this.$store.state.name.label
      const requesterUserId = '7cgbnAfPS8ySvTrNJgy64AWsJdwkXESk8CspfCBm7uyN'
      const requesterUserName = 'DashDonuts'
      const encRefundAddress = await freshAddress()

      const document = {
        requesterUserId,
        requesterUserName,
        requesteeUserId,
        requesteeUserName,
        encRefundAddress,
        timestamp: timestamp(),
      }
      await submitDocument({ contract, typeLocator, document })
      this.$store.dispatch('showSnackbar', {
        text: 'PaymentIntent sent!',
        color: 'green',
      })
      this.$router.push('/actions')
    },
  },
}
</script>

<style></style>
