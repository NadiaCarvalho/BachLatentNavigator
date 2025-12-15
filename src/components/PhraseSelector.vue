<template>
    <select @change="onSelect">
        <option v-for="p in phrases" :value="p.id">
            {{ p.name }}
        </option>
    </select>
</template>

<script>
</script>

<style>
</style>